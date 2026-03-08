import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

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

function normalizeSecretKey(raw: Uint8Array): Uint8Array {
  // Standard Solana/tweetnacl secret key (64 bytes)
  if (raw.length === 64) return raw;

  // Seed-only key (32 bytes)
  if (raw.length === 32) {
    return nacl.sign.keyPair.fromSeed(raw).secretKey;
  }

  // Ed25519 PKCS8 (48 bytes): 16-byte prefix + 32-byte seed
  const pkcs8Ed25519Prefix = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
    0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
  ]);

  if (raw.length === 48) {
    const prefixMatches = pkcs8Ed25519Prefix.every((b, i) => raw[i] === b);
    if (prefixMatches) {
      const seed = raw.slice(16, 48);
      return nacl.sign.keyPair.fromSeed(seed).secretKey;
    }
  }

  // Fallback: detect ASN.1 OCTET STRING marker (04 20) and use following 32 bytes as seed
  for (let i = 0; i <= raw.length - 34; i++) {
    if (raw[i] === 0x04 && raw[i + 1] === 0x20) {
      const seed = raw.slice(i + 2, i + 34);
      return nacl.sign.keyPair.fromSeed(seed).secretKey;
    }
  }

  throw new Error(`Unsupported private key format (${raw.length} bytes)`);
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

      // Generate Solana keypair using tweetnacl
      const keyPair = nacl.sign.keyPair();
      // keyPair.secretKey is 64 bytes (seed 32 + public 32) - this is what Solana wallets expect
      const publicKeyBase58 = base58Encode(keyPair.publicKey);
      const encryptedKey = encryptKey(keyPair.secretKey, encryptionSecret);

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

      if (!destinationAddress || !amountSol || amountSol <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('id, public_key, sol_balance, encrypted_private_key')
        .eq('user_id', user.id)
        .single();

      if (!wallet) {
        return new Response(JSON.stringify({ error: 'No wallet found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check live balance
      const liveBalance = await getSolBalance(wallet.public_key);
      const fee = 0.000005; // ~5000 lamports tx fee
      if (liveBalance < amountSol + fee) {
        return new Response(JSON.stringify({ error: `Yetersiz bakiye. Mevcut: ${liveBalance.toFixed(6)} SOL` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Decrypt private key
      let secretKey: Uint8Array;
      try {
        secretKey = decryptKey(wallet.encrypted_private_key, encryptionSecret);
        // Validate: must be 64 bytes for Ed25519 (nacl sign keypair)
        if (secretKey.length !== 64) {
          throw new Error(`Invalid key length: ${secretKey.length}, expected 64`);
        }
        // Verify the public key matches
        const derivedPubKey = secretKey.slice(32);
        const storedPubKeyBytes = base58Decode(wallet.public_key);
        const pubKeysMatch = derivedPubKey.every((b, i) => b === storedPubKeyBytes[i]);
        if (!pubKeysMatch) {
          throw new Error('Decrypted key does not match wallet public key');
        }
      } catch (e) {
        console.error('Key decryption error:', e);
        return new Response(JSON.stringify({ error: 'Private key formatı hatalı. Lütfen yeni cüzdan oluşturun.' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build a raw SOL transfer transaction
      try {
        const HELIUS_API_KEY = Deno.env.get('HELIUS_API_KEY');
        const rpcUrl = HELIUS_API_KEY 
          ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
          : 'https://api.mainnet-beta.solana.com';

        // Get recent blockhash
        const bhRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'getLatestBlockhash',
            params: [{ commitment: 'finalized' }],
          }),
        });
        const bhData = await bhRes.json();
        if (bhData.error) throw new Error(bhData.error.message);
        const blockhash = bhData.result.value.blockhash;

        // Build transaction manually (SystemProgram.transfer)
        const fromPubkey = base58Decode(wallet.public_key);
        const toPubkey = base58Decode(destinationAddress);
        const lamports = Math.floor(amountSol * 1e9);

        // System Program ID (all zeros)
        const systemProgramId = new Uint8Array(32);

        // Compact array helper
        function encodeCompactU16(value: number): Uint8Array {
          if (value < 128) return new Uint8Array([value]);
          if (value < 16384) return new Uint8Array([value & 0x7f | 0x80, value >> 7]);
          return new Uint8Array([value & 0x7f | 0x80, (value >> 7) & 0x7f | 0x80, value >> 14]);
        }

        // Encode u64 little-endian
        function encodeU64LE(value: number): Uint8Array {
          const buf = new Uint8Array(8);
          const lo = value & 0xffffffff;
          const hi = Math.floor(value / 0x100000000) & 0xffffffff;
          buf[0] = lo & 0xff; buf[1] = (lo >> 8) & 0xff;
          buf[2] = (lo >> 16) & 0xff; buf[3] = (lo >> 24) & 0xff;
          buf[4] = hi & 0xff; buf[5] = (hi >> 8) & 0xff;
          buf[6] = (hi >> 16) & 0xff; buf[7] = (hi >> 24) & 0xff;
          return buf;
        }

        // Instruction data: transfer = index 2, then u64 lamports
        const instructionData = new Uint8Array(12);
        instructionData.set(new Uint8Array([2, 0, 0, 0]), 0); // u32 instruction index = 2
        instructionData.set(encodeU64LE(lamports), 4);

        // Message header: 1 signer, 0 readonly-signed, 1 readonly-unsigned (system program)
        const header = new Uint8Array([1, 0, 1]);

        // Account keys: [from, to, system_program]
        const accountKeys = new Uint8Array(96);
        accountKeys.set(fromPubkey, 0);
        accountKeys.set(toPubkey, 32);
        accountKeys.set(systemProgramId, 64);

        // Blockhash bytes
        const blockhashBytes = base58Decode(blockhash);

        // Instructions: 1 instruction
        // program_id_index = 2 (system program), accounts = [0, 1], data = instructionData
        const instructionAccountIndices = new Uint8Array([0, 1]);

        // Build message
        const numKeys = encodeCompactU16(3);
        const numInstructions = encodeCompactU16(1);
        const instrAcctsLen = encodeCompactU16(2);
        const instrDataLen = encodeCompactU16(instructionData.length);
        const programIdIndex = new Uint8Array([2]);

        const messageParts = [
          header,
          numKeys,
          accountKeys,
          blockhashBytes,
          numInstructions,
          programIdIndex,
          instrAcctsLen,
          instructionAccountIndices,
          instrDataLen,
          instructionData,
        ];

        const messageLength = messageParts.reduce((sum, p) => sum + p.length, 0);
        const message = new Uint8Array(messageLength);
        let offset = 0;
        for (const part of messageParts) {
          message.set(part, offset);
          offset += part.length;
        }

        // Sign with nacl
        const signature = nacl.sign.detached(message, secretKey);

        // Build full transaction: signatures count + signature + message
        const sigCount = encodeCompactU16(1);
        const txParts = [sigCount, signature, message];
        const txLength = txParts.reduce((sum, p) => sum + p.length, 0);
        const transaction = new Uint8Array(txLength);
        offset = 0;
        for (const part of txParts) {
          transaction.set(part, offset);
          offset += part.length;
        }

        // Send transaction
        const txBase64 = base64Encode(transaction);
        const sendRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'sendTransaction',
            params: [txBase64, { encoding: 'base64', skipPreflight: false }],
          }),
        });
        const sendData = await sendRes.json();

        if (sendData.error) {
          throw new Error(sendData.error.message || JSON.stringify(sendData.error));
        }

        const txSignature = sendData.result;
        console.log(`✅ Withdraw tx sent: ${txSignature}`);

        // Update balance
        const newBalance = Math.max(0, liveBalance - amountSol - fee);
        await supabase.from('user_wallets').update({ sol_balance: newBalance }).eq('id', wallet.id);

        // Record successful trade
        await supabase.from('trade_orders').insert({
          user_id: user.id,
          wallet_id: wallet.id,
          token_address: destinationAddress,
          token_symbol: 'SOL',
          order_type: 'withdraw',
          amount_sol: amountSol,
          status: 'completed',
          tx_signature: txSignature,
        });

        return new Response(JSON.stringify({
          success: true,
          message: `${amountSol} SOL gönderildi!`,
          txSignature,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } catch (txErr) {
        console.error('Withdraw tx error:', txErr);
        return new Response(JSON.stringify({ 
          error: `İşlem başarısız: ${txErr instanceof Error ? txErr.message : String(txErr)}` 
        }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
