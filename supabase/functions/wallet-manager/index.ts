import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple XOR encryption with key (for private key storage)
function encryptKey(data: Uint8Array, secret: string): string {
  const keyBytes = new TextEncoder().encode(secret);
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return base64Encode(encrypted);
}

function decryptKey(encryptedBase64: string, secret: string): Uint8Array {
  const encrypted = base64Decode(encryptedBase64);
  const keyBytes = new TextEncoder().encode(secret);
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  return decrypted;
}

// Generate Solana keypair using Ed25519
async function generateSolanaKeypair(): Promise<{ publicKey: string; secretKey: Uint8Array }> {
  const keyPair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyPkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  
  // Solana uses base58 for public keys
  const publicKeyBytes = new Uint8Array(publicKeyRaw);
  const publicKeyBase58 = base58Encode(publicKeyBytes);
  
  // Store the full PKCS8 private key
  const secretKeyBytes = new Uint8Array(privateKeyPkcs8);
  
  return { publicKey: publicKeyBase58, secretKey: secretKeyBytes };
}

// Base58 encoding (Solana standard)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let result = '';
  for (const byte of bytes) {
    if (byte === 0) result += '1';
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionSecret = Deno.env.get('WALLET_ENCRYPTION_KEY') || supabaseServiceKey.slice(0, 32);
    
    // Verify user auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action } = body;

    // ===== CREATE WALLET =====
    if (action === 'create-wallet') {
      // Check if user already has a wallet
      const { data: existing } = await supabase
        .from('user_wallets')
        .select('id, public_key, sol_balance')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        return new Response(JSON.stringify({
          success: true,
          wallet: { publicKey: existing.public_key, balance: existing.sol_balance },
          message: 'Wallet already exists',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { publicKey, secretKey } = await generateSolanaKeypair();
      const encryptedKey = encryptKey(secretKey, encryptionSecret);

      await supabase.from('user_wallets').insert({
        user_id: user.id,
        public_key: publicKey,
        encrypted_private_key: encryptedKey,
        sol_balance: 0,
      });

      return new Response(JSON.stringify({
        success: true,
        wallet: { publicKey, balance: 0 },
        message: 'Wallet created! Deposit SOL to start trading.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== GET WALLET =====
    if (action === 'get-wallet') {
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('id, public_key, sol_balance, created_at')
        .eq('user_id', user.id)
        .single();

      if (!wallet) {
        return new Response(JSON.stringify({ success: true, wallet: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check on-chain balance via Helius
      const heliusKey = Deno.env.get('HELIUS_API_KEY');
      let onChainBalance = wallet.sol_balance;
      
      if (heliusKey) {
        try {
          const balRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1,
              method: 'getBalance',
              params: [wallet.public_key],
            }),
          });
          const balData = await balRes.json();
          if (balData.result?.value !== undefined) {
            onChainBalance = balData.result.value / 1e9; // lamports to SOL
            // Update DB balance
            await supabase
              .from('user_wallets')
              .update({ sol_balance: onChainBalance })
              .eq('id', wallet.id);
          }
        } catch (e) {
          console.error('Balance check error:', e);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        wallet: {
          id: wallet.id,
          publicKey: wallet.public_key,
          balance: onChainBalance,
          createdAt: wallet.created_at,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== EXECUTE TRADE =====
    if (action === 'execute-trade') {
      const { tokenAddress, tokenSymbol, orderType, amountSol } = body;
      
      if (!tokenAddress || !orderType || !amountSol) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (amountSol <= 0 || amountSol > 100) {
        return new Response(JSON.stringify({ error: 'Invalid amount (0.001 - 100 SOL)' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user wallet
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!wallet) {
        return new Response(JSON.stringify({ error: 'No wallet found. Create one first.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (orderType === 'buy' && wallet.sol_balance < amountSol) {
        return new Response(JSON.stringify({ error: `Insufficient balance. You have ${wallet.sol_balance} SOL.` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create order record
      const { data: order, error: orderError } = await supabase
        .from('trade_orders')
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          token_address: tokenAddress,
          token_symbol: tokenSymbol || null,
          order_type: orderType,
          amount_sol: amountSol,
          status: 'executing',
        })
        .select()
        .single();

      if (orderError) {
        return new Response(JSON.stringify({ error: 'Failed to create order' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Execute swap via Jupiter
      try {
        const SOL_MINT = 'So11111111111111111111111111111111111111112';
        const inputMint = orderType === 'buy' ? SOL_MINT : tokenAddress;
        const outputMint = orderType === 'buy' ? tokenAddress : SOL_MINT;
        const amountLamports = Math.floor(amountSol * 1e9);

        // Get Jupiter quote
        const quoteRes = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=300`
        );
        const quote = await quoteRes.json();

        if (quote.error) {
          throw new Error(quote.error);
        }

        // Get swap transaction
        const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: wallet.public_key,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 'auto',
          }),
        });
        const swapData = await swapRes.json();

        if (swapData.error) {
          throw new Error(swapData.error);
        }

        // Decrypt private key and sign transaction
        const secretKeyBytes = decryptKey(wallet.encrypted_private_key, encryptionSecret);
        
        // Import the private key for signing
        const privateKey = await crypto.subtle.importKey(
          "pkcs8",
          secretKeyBytes,
          "Ed25519",
          false,
          ["sign"]
        );

        // Decode the swap transaction
        const swapTransactionBuf = base64Decode(swapData.swapTransaction);
        
        // Sign the transaction
        const signature = await crypto.subtle.sign("Ed25519", privateKey, swapTransactionBuf);
        const signatureBase64 = base64Encode(new Uint8Array(signature));

        // Send the signed transaction via Helius
        const heliusKey = Deno.env.get('HELIUS_API_KEY');
        const sendRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendTransaction',
            params: [swapData.swapTransaction, { encoding: 'base64' }],
          }),
        });
        const sendData = await sendRes.json();

        if (sendData.error) {
          throw new Error(sendData.error.message || 'Transaction failed');
        }

        const txSignature = sendData.result;

        // Update order as completed
        await supabase
          .from('trade_orders')
          .update({
            status: 'completed',
            tx_signature: txSignature,
            price_at_trade: quote.outAmount ? Number(quote.outAmount) / 1e9 : null,
          })
          .eq('id', order.id);

        // Update balance
        const newBalance = orderType === 'buy' 
          ? wallet.sol_balance - amountSol 
          : wallet.sol_balance + amountSol;
        await supabase
          .from('user_wallets')
          .update({ sol_balance: Math.max(0, newBalance) })
          .eq('id', wallet.id);

        return new Response(JSON.stringify({
          success: true,
          order: {
            id: order.id,
            txSignature,
            status: 'completed',
            orderType,
            amountSol,
            tokenAddress,
          },
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } catch (tradeError) {
        // Update order as failed
        await supabase
          .from('trade_orders')
          .update({
            status: 'failed',
            error_message: String(tradeError),
          })
          .eq('id', order.id);

        return new Response(JSON.stringify({
          success: false,
          error: `Trade failed: ${tradeError}`,
          orderId: order.id,
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ===== GET TRADE HISTORY =====
    if (action === 'get-trades') {
      const { data: trades } = await supabase
        .from('trade_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ success: true, trades: trades || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Wallet manager error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
