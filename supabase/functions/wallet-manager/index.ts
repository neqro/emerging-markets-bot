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

// Base58 encoding/decoding (Solana standard)
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

function base58Decode(str: string): Uint8Array {
  const digits = [0];
  for (const char of str) {
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry === -1) throw new Error('Invalid base58 character');
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] * 58;
      digits[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      digits.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const result = new Uint8Array(digits);
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    result[i] = 0;
  }
  return result.reverse();
}

// Fetch SOL balance from Solana RPC
async function getSolBalance(publicKey: string): Promise<number> {
  try {
    const rpcUrl = 'https://api.mainnet-beta.solana.com';
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [publicKey],
      }),
    });
    const data = await res.json();
    if (data.result?.value !== undefined) {
      return data.result.value / 1e9; // lamports to SOL
    }
    return 0;
  } catch (e) {
    console.error('Balance fetch error:', e);
    return 0;
  }
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

      // Fetch live balance from Solana and update DB
      const liveBalance = await getSolBalance(wallet.public_key);
      if (liveBalance !== wallet.sol_balance) {
        await supabase
          .from('user_wallets')
          .update({ sol_balance: liveBalance })
          .eq('id', wallet.id);
      }

      return new Response(JSON.stringify({
        success: true,
        wallet: {
          id: wallet.id,
          publicKey: wallet.public_key,
          balance: liveBalance,
          createdAt: wallet.created_at,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== CREATE WALLET =====
    if (action === 'create-wallet') {
      // Check if wallet already exists
      const { data: existing } = await supabase
        .from('user_wallets')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ error: 'Wallet already exists' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate Ed25519 keypair using Web Crypto
      const keyPair = await crypto.subtle.generateKey(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify']
      );

      const privateKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.privateKey));
      const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));

      // Solana keypair is 64 bytes: private (32) + public (32)
      const fullKeypair = new Uint8Array(64);
      fullKeypair.set(privateKeyRaw, 0);
      fullKeypair.set(publicKeyRaw, 32);

      const publicKeyBase58 = base58Encode(publicKeyRaw);
      const encryptedKey = encryptKey(fullKeypair, encryptionSecret);

      const { data: wallet, error } = await supabase
        .from('user_wallets')
        .insert({
          user_id: user.id,
          public_key: publicKeyBase58,
          encrypted_private_key: encryptedKey,
          sol_balance: 0,
        })
        .select('id, public_key, sol_balance, created_at')
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        wallet: {
          id: wallet.id,
          publicKey: wallet.public_key,
          balance: wallet.sol_balance,
          createdAt: wallet.created_at,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== EXPORT PRIVATE KEY =====
    if (action === 'export-key') {
      const { password } = body;
      if (!password) {
        return new Response(JSON.stringify({ error: 'Password required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify password by attempting sign-in
      const { error: signInError } = await supabaseUser.auth.signInWithPassword({
        email: user.email!,
        password,
      });

      if (signInError) {
        return new Response(JSON.stringify({ error: 'Invalid password' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get encrypted key
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('encrypted_private_key')
        .eq('user_id', user.id)
        .single();

      if (!wallet) {
        return new Response(JSON.stringify({ error: 'No wallet found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Decrypt and return as base58
      const decryptedKeypair = decryptKey(wallet.encrypted_private_key, encryptionSecret);
      const privateKeyBase58 = base58Encode(decryptedKeypair);

      return new Response(JSON.stringify({
        success: true,
        privateKey: privateKeyBase58,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== EXECUTE TRADE =====
    if (action === 'execute-trade') {
      const { tokenAddress, tokenSymbol, orderType, amountSol } = body;

      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('id, sol_balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet) {
        return new Response(JSON.stringify({ error: 'No wallet found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (orderType === 'buy' && wallet.sol_balance < amountSol) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Record trade order as pending
      const { data: trade, error } = await supabase
        .from('trade_orders')
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          token_address: tokenAddress,
          token_symbol: tokenSymbol || null,
          order_type: orderType,
          amount_sol: amountSol,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, trade }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== WITHDRAW =====
    if (action === 'withdraw') {
      const { destinationAddress, amountSol } = body;

      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('id, public_key, sol_balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet) {
        return new Response(JSON.stringify({ error: 'No wallet found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (wallet.sol_balance < amountSol) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Record withdrawal as trade order
      const { data: trade, error } = await supabase
        .from('trade_orders')
        .insert({
          user_id: user.id,
          wallet_id: wallet.id,
          token_address: destinationAddress,
          token_symbol: 'SOL',
          order_type: 'withdraw',
          amount_sol: amountSol,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, trade }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
