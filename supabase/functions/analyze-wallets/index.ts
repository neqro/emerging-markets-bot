import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HELIUS_API_KEY = Deno.env.get('HELIUS_API_KEY');
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// ===== Encryption / Base58 helpers =====
function decryptKey(encryptedBase64: string, secret: string): Uint8Array {
  const encrypted = base64Decode(encryptedBase64);
  const keyBytes = new TextEncoder().encode(secret);
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  return decrypted;
}

function normalizeSecretKey(raw: Uint8Array): Uint8Array {
  if (raw.length === 64) return raw;
  if (raw.length === 32) return nacl.sign.keyPair.fromSeed(raw).secretKey;
  // PKCS8 Ed25519 (48 bytes)
  if (raw.length === 48 && raw[0] === 0x30 && raw[14] === 0x04 && raw[15] === 0x20) {
    return nacl.sign.keyPair.fromSeed(raw.slice(16, 48)).secretKey;
  }
  // Fallback ASN.1
  for (let i = 0; i <= raw.length - 34; i++) {
    if (raw[i] === 0x04 && raw[i + 1] === 0x20) {
      return nacl.sign.keyPair.fromSeed(raw.slice(i + 2, i + 34)).secretKey;
    }
  }
  throw new Error(`Unsupported key format (${raw.length} bytes)`);
}

// ===== Jupiter swap helper (uses api.jup.ag + local signing) =====
async function executeJupiterSwap(
  inputMint: string,
  outputMint: string,
  amountLamports: number,
  secretKey: Uint8Array,
  publicKeyBase58: string,
  slippageBps: number = 300,
): Promise<{ success: boolean; txSignature?: string; outAmount?: number; error?: string }> {
  try {
    // 1. Get quote from Jupiter (new API endpoint)
    const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}`;
    console.log(`📡 Jupiter quote: ${inputMint.slice(0, 8)}→${outputMint.slice(0, 8)} | ${amountLamports} lamports`);
    
    const quoteRes = await fetch(quoteUrl);
    const quote = await quoteRes.json();
    if (quote.error) return { success: false, error: `Quote error: ${quote.error}` };

    // 2. Get swap transaction
    const swapRes = await fetch('https://api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: publicKeyBase58,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });
    const swapData = await swapRes.json();
    if (swapData.error) return { success: false, error: `Swap error: ${swapData.error}` };

    // 3. Deserialize, sign and send
    const txBytes = base64Decode(swapData.swapTransaction);
    
    // The transaction from Jupiter is a VersionedTransaction serialized as base64
    // We need to sign it and send it
    // Find signature placeholder (first 64 bytes after compact array prefix)
    // For a single-signer tx: [1, <64 zero bytes>, <message>]
    const signatureOffset = 1; // after compact-u16 for 1 signature
    const message = txBytes.slice(signatureOffset + 64);
    const signature = nacl.sign.detached(message, secretKey);
    
    // Replace the zero signature with our real signature
    const signedTx = new Uint8Array(txBytes.length);
    signedTx.set(txBytes);
    signedTx.set(signature, signatureOffset);

    const signedTxBase64 = base64Encode(signedTx);

    // 4. Send via Helius RPC (always reachable)
    const sendRes = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'sendTransaction',
        params: [signedTxBase64, { encoding: 'base64', skipPreflight: true, maxRetries: 3 }],
      }),
    });
    const sendData = await sendRes.json();

    if (sendData.error) return { success: false, error: `RPC error: ${sendData.error.message}` };

    return {
      success: true,
      txSignature: sendData.result,
      outAmount: quote.outAmount ? Number(quote.outAmount) : undefined,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Gerçek Solana top whale/smart money cüzdanları
const TOP_WHALE_WALLETS = [
  // Wintermute (Market Maker)
  "CTV3h6MdZQYjmAjBdCnVGD2bZb8VbYpFEHkqH45mHNcN",
  // Jump Trading
  "MEVgKbG37LLBuHPYMRZB8CpkGvd5VNWbRHsEE3wMFmu",
  // Alameda Research (historical patterns)
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  // Known profitable Solana traders
  "7rhxnLV8C76MrBFhFnhLReqSmMXXiY3UaFqchPXz7soZ",
  "DYw8jCTdBNt8jwfn6Ts5KBxLB3HLKFGMghXJYhEpB5sK",
  "FDqHnZKzsBKYRCpRnXumMWpDraFTDfYGnRXKzeRmqBYp",
  "3BMNC8ypBW1Fz9wfyUo4dFUp8iGcakzJGv14og9bLDZH",
  "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
  // Drift Protocol whale
  "JCNCMFXo5M68qVs4Qhb4RNdEhFJG1VwTLQ5vGhmXdhr",
  // Known smart money wallets
  "4dMKjzu4u1P43Vdhv1nHvJmZyBch1fBNJKBP3YLG7oaD",
  "6SBx89NbeGBTaKPULm89P1tqWnST9TCPZy4UXqJiYhQi",
  "HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwYKCSfYVunpR",
  // Top DeFi traders
  "3tBKR7vZ3WKWcQiPvT8yVi9EzFRMxECNe7vXbFm7dPFN",
  "Enw6c1fPz4MufXLB7u95XHEyhwjjLBRFMCB79MJcRpb3",
  "8rvwEMJB7qcSbKm1cMGU9tpNKbqgFjSo2hHPUzsiDVhG",
];

interface WalletTransaction {
  signature: string;
  type: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  amount?: number;
  amountUsd?: number;
  timestamp: number;
  feePayer?: string;
}

async function getTokenHolders(tokenAddress: string): Promise<any[]> {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'holders',
        method: 'getTokenLargestAccounts',
        params: [tokenAddress],
      }),
    });
    const data = await response.json();
    return data.result?.value || [];
  } catch (error) {
    console.error('Error fetching token holders:', error);
    return [];
  }
}

async function getWalletTransactions(walletAddress: string, limit = 50): Promise<WalletTransaction[]> {
  try {
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}`
    );
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    return data.map((tx: any) => {
      const tokenTransfer = tx.tokenTransfers?.[0];
      return {
        signature: tx.signature,
        type: tx.type,
        tokenAddress: tokenTransfer?.mint,
        tokenSymbol: tokenTransfer?.tokenStandard,
        amount: tokenTransfer?.tokenAmount,
        timestamp: tx.timestamp,
        feePayer: tx.feePayer,
      };
    });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return [];
  }
}

async function detectBotActivity(tokenAddress: string): Promise<{ isBotHeavy: boolean; botScore: number }> {
  try {
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=100`
    );
    const transactions = await response.json();
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { isBotHeavy: false, botScore: 0 };
    }

    const walletFrequency: Record<string, number> = {};
    let rapidTrades = 0;
    let prevTimestamp = 0;

    for (const tx of transactions) {
      const wallet = tx.feePayer;
      if (wallet) {
        walletFrequency[wallet] = (walletFrequency[wallet] || 0) + 1;
      }
      if (prevTimestamp && Math.abs(tx.timestamp - prevTimestamp) < 10) {
        rapidTrades++;
      }
      prevTimestamp = tx.timestamp;
    }

    const maxTrades = Math.max(...Object.values(walletFrequency), 0);
    const uniqueWallets = Object.keys(walletFrequency).length;
    
    const repeatTradeScore = Math.min((maxTrades / 10) * 30, 30);
    const rapidTradeScore = Math.min((rapidTrades / 20) * 40, 40);
    const lowDiversityScore = uniqueWallets < 20 ? 30 : 0;
    
    const botScore = Math.round(repeatTradeScore + rapidTradeScore + lowDiversityScore);
    
    return { isBotHeavy: botScore > 50, botScore };
  } catch (error) {
    console.error('Error detecting bot activity:', error);
    return { isBotHeavy: false, botScore: 0 };
  }
}

async function checkWhaleInterest(
  tokenAddress: string,
  supabase: any
): Promise<{ whalesInterested: number; whaleWallets: string[] }> {
  // DB'deki tracked wallets'ı da kontrol et
  const { data: dbWallets } = await supabase
    .from('tracked_wallets')
    .select('address')
    .eq('is_whale', true);
  
  const allWhales = [
    ...TOP_WHALE_WALLETS,
    ...(dbWallets || []).map((w: any) => w.address),
  ];
  // Deduplicate
  const uniqueWhales = [...new Set(allWhales)];
  
  const interestedWhales: string[] = [];
  
  // Paralel olarak kontrol et (5'erli batch)
  for (let i = 0; i < uniqueWhales.length; i += 5) {
    const batch = uniqueWhales.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(async (whale) => {
        const transactions = await getWalletTransactions(whale, 30);
        const hasBought = transactions.some(tx => 
          tx.tokenAddress === tokenAddress && (tx.type === 'SWAP' || tx.type === 'TRANSFER')
        );
        return { whale, hasBought };
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.hasBought) {
        interestedWhales.push(result.value.whale);
      }
    }
  }
  
  return {
    whalesInterested: interestedWhales.length,
    whaleWallets: interestedWhales,
  };
}

// DexScreener'dan yeni + trending Solana token'larını al
async function getNewSolanaTokens(): Promise<string[]> {
  const tokens = new Set<string>();
  try {
    // Yeni token profilleri
    const [newRes, trendRes] = await Promise.all([
      fetch('https://api.dexscreener.com/token-profiles/latest/v1'),
      fetch('https://api.dexscreener.com/token-boosts/top/v1'),
    ]);
    const newProfiles = await newRes.json();
    const trendProfiles = await trendRes.json();
    
    for (const p of (newProfiles || []).filter((p: any) => p.chainId === 'solana').slice(0, 15)) {
      tokens.add(p.tokenAddress);
    }
    for (const p of (trendProfiles || []).filter((p: any) => p.chainId === 'solana').slice(0, 10)) {
      tokens.add(p.tokenAddress);
    }
  } catch (error) {
    console.error('Error fetching tokens:', error);
  }
  return [...tokens];
}

// DexScreener'dan token bilgisi al
async function getTokenInfo(tokenAddress: string): Promise<any> {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${tokenAddress}`);
    const pairs = await res.json();
    return Array.isArray(pairs) && pairs.length > 0 ? pairs[0] : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'auto-scan';

    // ===== OTOMATİK TARAMA =====
    if (action === 'auto-scan') {
      console.log('🔍 Otomatik tarama başlatılıyor...');
      
      // Eski sinyalleri deaktive et (30 dk'dan eski)
      await supabase
        .from('bot_signals')
        .update({ is_active: false })
        .eq('is_active', true)
        .lt('created_at', new Date(Date.now() - 30 * 60000).toISOString());
      
      const tokenAddresses = await getNewSolanaTokens();
      console.log(`📋 ${tokenAddresses.length} token bulundu`);
      
      const results = [];
      
      for (const tokenAddress of tokenAddresses) {
        try {
          // Daha önce analiz edilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('token_analysis')
            .select('id')
            .eq('token_address', tokenAddress)
            .gte('analyzed_at', new Date(Date.now() - 15 * 60000).toISOString()) // son 15 dakika
            .limit(1);
          
          if (existing && existing.length > 0) {
            console.log(`⏭️ ${tokenAddress.slice(0, 8)}... zaten analiz edilmiş`);
            continue;
          }

          // Token bilgisi al
          const tokenInfo = await getTokenInfo(tokenAddress);
          const tokenSymbol = tokenInfo?.baseToken?.symbol || null;
          const liquidity = tokenInfo?.liquidity?.usd || 0;
          const volume24h = tokenInfo?.volume?.h24 || 0;
          
          // Minimum likidite filtresi
          if (liquidity < 5000) {
            console.log(`⏭️ ${tokenSymbol || tokenAddress.slice(0, 8)} düşük likidite ($${liquidity})`);
            continue;
          }

          console.log(`🔬 ${tokenSymbol || tokenAddress.slice(0, 8)} analiz ediliyor...`);
          
          // Paralel analiz
          const [botAnalysis, holders] = await Promise.all([
            detectBotActivity(tokenAddress),
            getTokenHolders(tokenAddress),
          ]);
          
          // Whale kontrolü (rate limit için sınırlı)
          const whaleAnalysis = await checkWhaleInterest(tokenAddress, supabase);

          // Top 10 holder yüzdesi
          const totalSupply = holders.reduce((sum: number, h: any) => sum + parseFloat(h.amount || '0'), 0);
          const top10Supply = holders.slice(0, 10).reduce((sum: number, h: any) => sum + parseFloat(h.amount || '0'), 0);
          const top10Percentage = totalSupply > 0 ? (top10Supply / totalSupply) * 100 : 0;

          // Risk skoru - yeni token'lar doğal olarak yüksek top10'a sahip, bunu normalleştir
          const holderRisk = top10Percentage > 90 ? 25 : top10Percentage > 70 ? 15 : top10Percentage > 50 ? 10 : 0;
          const botRisk = botAnalysis.botScore * 0.35;
          const whaleBonus = whaleAnalysis.whalesInterested > 0 ? -10 : 10;
          const volumeBonus = volume24h > 100000 ? -10 : volume24h > 50000 ? -5 : 0;
          const liquidityBonus = liquidity > 20000 ? -10 : liquidity > 10000 ? -5 : 5;
          const riskScore = Math.max(0, Math.min(
            botRisk + holderRisk + whaleBonus + 20 + volumeBonus + liquidityBonus,
            100
          ));

          // Token analizi kaydet
          await supabase.from('token_analysis').insert({
            token_address: tokenAddress,
            token_symbol: tokenSymbol,
            holder_count: holders.length,
            top_10_holder_percentage: top10Percentage,
            bot_transaction_percentage: botAnalysis.botScore,
            risk_score: riskScore,
          });

          // Sinyal mantığı — çeşitlendirilmiş buy/sell/watch sinyalleri
          let signalType: string = 'watch';
          let reason = '';
          let confidence = 0;
          const priceChange1h = tokenInfo?.priceChange?.h1 || 0;
          const priceChange5m = tokenInfo?.priceChange?.m5 || 0;
          const txnsBuys = tokenInfo?.txns?.h1?.buys || 0;
          const txnsSells = tokenInfo?.txns?.h1?.sells || 0;
          const buyPressure = txnsBuys + txnsSells > 0 ? (txnsBuys / (txnsBuys + txnsSells)) * 100 : 50;
          const totalTxns = txnsBuys + txnsSells;

          // === STRONG BUY: Whale + düşük risk ===
          if (whaleAnalysis.whalesInterested >= 2 && riskScore < 35) {
            signalType = 'buy';
            confidence = Math.min(90, 70 + whaleAnalysis.whalesInterested * 5);
            reason = `🐋 ${whaleAnalysis.whalesInterested} whale alım yaptı | Risk: ${riskScore.toFixed(0)}% | Liq: $${(liquidity / 1000).toFixed(1)}K`;
          }
          // === BUY: Yüksek hacim + alım baskısı + kabul edilebilir risk ===
          else if (buyPressure > 55 && volume24h > 30000 && riskScore < 45 && liquidity > 8000) {
            signalType = 'buy';
            confidence = Math.min(80, Math.round(buyPressure * 0.6 + (100 - riskScore) * 0.3));
            reason = `📈 Alım baskısı %${buyPressure.toFixed(0)} | Vol: $${(volume24h / 1000).toFixed(1)}K | ${priceChange1h > 0 ? '↑' : '↓'}${Math.abs(priceChange1h).toFixed(1)}% 1h`;
          }
          // === BUY: Whale ilgileniyor + düşük bot ===
          else if (whaleAnalysis.whalesInterested >= 1 && botAnalysis.botScore < 40 && riskScore < 50) {
            signalType = 'buy';
            confidence = Math.min(70, 55 + whaleAnalysis.whalesInterested * 10);
            reason = `👀 ${whaleAnalysis.whalesInterested} whale ilgileniyor | Bot: ${botAnalysis.botScore}% | Liq: $${(liquidity / 1000).toFixed(1)}K`;
          }
          // === BUY: Momentum — fiyat yükseliyor + güçlü hacim ===
          else if (priceChange1h > 20 && volume24h > 50000 && riskScore < 45 && buyPressure > 50) {
            signalType = 'buy';
            confidence = Math.min(75, Math.round(40 + priceChange1h * 0.3));
            reason = `🚀 Momentum ↑${priceChange1h.toFixed(0)}% 1h | Vol: $${(volume24h / 1000).toFixed(1)}K | ${totalTxns} işlem`;
          }
          // === BUY: Yeni token, iyi likidite, düşük risk ===
          else if (riskScore < 35 && liquidity > 10000 && totalTxns > 100) {
            signalType = 'buy';
            confidence = Math.min(65, Math.round(60 - riskScore * 0.5));
            reason = `💎 Düşük risk (${riskScore.toFixed(0)}%) | Liq: $${(liquidity / 1000).toFixed(1)}K | ${totalTxns} işlem`;
          }
          // === SELL: Yüksek bot aktivitesi ===
          else if (botAnalysis.botScore > 65) {
            signalType = 'sell';
            confidence = Math.min(90, botAnalysis.botScore);
            reason = `🤖 Yüksek bot aktivitesi (${botAnalysis.botScore}%) | Top10: ${top10Percentage.toFixed(0)}% | RUG RİSKİ`;
          }
          // === SELL: Bot + yoğun sahiplik ===
          else if (botAnalysis.botScore > 35 && top10Percentage > 85) {
            signalType = 'sell';
            confidence = Math.min(80, Math.round(botAnalysis.botScore + 15));
            reason = `⚠️ Bot: ${botAnalysis.botScore}% | Top10: ${top10Percentage.toFixed(0)}% | Dikkatli ol`;
          }
          // === SELL: Fiyat düşüyor + satış baskısı ===
          else if (priceChange1h < -30 && buyPressure < 45 && riskScore > 40) {
            signalType = 'sell';
            confidence = Math.min(75, Math.round(50 + Math.abs(priceChange1h) * 0.3));
            reason = `📉 Düşüş ↓${Math.abs(priceChange1h).toFixed(0)}% 1h | Satış baskısı %${(100 - buyPressure).toFixed(0)} | Risk: ${riskScore.toFixed(0)}%`;
          }
          // === SELL: Çok yüksek risk ===
          else if (riskScore >= 60) {
            signalType = 'sell';
            confidence = Math.min(85, Math.round(riskScore));
            reason = `🔴 Yüksek risk (${riskScore.toFixed(0)}%) | Bot: ${botAnalysis.botScore}% | Top10: ${top10Percentage.toFixed(0)}%`;
          }
          // === WATCH: Yüksek hacim ama kararsız ===
          else if (volume24h > 50000 && riskScore < 55) {
            signalType = 'watch';
            confidence = Math.min(60, Math.round(50 + volume24h / 100000 * 10));
            reason = `📊 Yüksek hacim $${(volume24h / 1000).toFixed(1)}K | Risk: ${riskScore.toFixed(0)}% | ${priceChange1h > 0 ? '↑' : '↓'}${Math.abs(priceChange1h).toFixed(1)}% 1h`;
          }
          // === WATCH: Orta risk, izle ===
          else {
            signalType = riskScore < 45 ? 'watch' : 'sell';
            confidence = Math.max(25, Math.round(50 - riskScore * 0.3));
            reason = riskScore < 45
              ? `👁️ İzleniyor | Risk: ${riskScore.toFixed(0)}% | Liq: $${(liquidity / 1000).toFixed(1)}K | Vol: $${(volume24h / 1000).toFixed(1)}K`
              : `⚠️ Orta risk (${riskScore.toFixed(0)}%) | Top10: ${top10Percentage.toFixed(0)}% | Vol: $${(volume24h / 1000).toFixed(1)}K`;
          }

          // Her token için sinyal kaydet
          {
            // Aynı token için aktif sinyal varsa güncelle
            await supabase
              .from('bot_signals')
              .update({ is_active: false })
              .eq('token_address', tokenAddress)
              .eq('is_active', true);

            await supabase.from('bot_signals').insert({
              token_address: tokenAddress,
              token_symbol: tokenSymbol,
              signal_type: signalType,
              confidence_score: confidence,
              reason,
              whale_wallets_buying: whaleAnalysis.whalesInterested,
              bot_activity_score: botAnalysis.botScore,
              liquidity_usd: liquidity,
              volume_24h: volume24h,
            });
            
            console.log(`✅ ${tokenSymbol}: ${signalType} sinyali (güven: ${confidence.toFixed(0)}%)`);
          }

          results.push({
            token: tokenSymbol || tokenAddress.slice(0, 8),
            riskScore,
            botScore: botAnalysis.botScore,
            whales: whaleAnalysis.whalesInterested,
            signal: signalType,
          });

          // Rate limit - her token arası 500ms bekle
          await new Promise(r => setTimeout(r, 500));
          
        } catch (error) {
          console.error(`❌ Token analiz hatası ${tokenAddress}:`, error);
        }
      }

      console.log(`🏁 Tarama tamamlandı: ${results.length} token analiz edildi`);

      // ===== OTOMATİK TRADE ÇALIŞTIR =====
      let autoTradeResults: any[] = [];
      try {
        // Auto-trade ayarları aktif olan kullanıcıları bul
        const { data: activeSettings } = await supabase
          .from('auto_trade_settings')
          .select('*')
          .eq('is_enabled', true);

        if (activeSettings && activeSettings.length > 0) {
          console.log(`🤖 ${activeSettings.length} kullanıcı için auto-trade kontrol ediliyor...`);

          // Aktif sinyalleri al
          const { data: activeSignals } = await supabase
            .from('bot_signals')
            .select('*')
            .eq('is_active', true)
            .order('confidence_score', { ascending: false });

          for (const settings of activeSettings) {
            try {
              // Günlük limit resetle (24 saat geçtiyse)
              const lastReset = new Date(settings.daily_reset_at);
              const now = new Date();
              if (now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000) {
                await supabase
                  .from('auto_trade_settings')
                  .update({ daily_sol_used: 0, daily_reset_at: now.toISOString() })
                  .eq('id', settings.id);
                settings.daily_sol_used = 0;
              }

              // Günlük limit kontrolü
              if (settings.daily_sol_used >= settings.max_daily_sol) {
                console.log(`⏸️ ${settings.user_id.slice(0, 8)}: Günlük limit doldu (${settings.daily_sol_used}/${settings.max_daily_sol} SOL)`);
                continue;
              }

              // Kullanıcının cüzdanını al + secret key decrypt
              const { data: wallet } = await supabase
                .from('user_wallets')
                .select('*')
                .eq('user_id', settings.user_id)
                .single();

              if (!wallet || wallet.sol_balance < 0.01) {
                console.log(`⏸️ ${settings.user_id.slice(0, 8)}: Yetersiz bakiye (${wallet?.sol_balance || 0} SOL)`);
                continue;
              }

              // Decrypt secret key for signing
              const encryptionSecret = Deno.env.get('WALLET_ENCRYPTION_KEY') || supabaseKey.slice(0, 32);
              let walletSecretKey: Uint8Array;
              try {
                const rawKey = decryptKey(wallet.encrypted_private_key, encryptionSecret);
                walletSecretKey = normalizeSecretKey(rawKey);
              } catch (keyErr) {
                console.error(`❌ ${settings.user_id.slice(0, 8)}: Key decrypt hata:`, keyErr);
                continue;
              }

              // Mevcut açık pozisyonları kontrol et (tamamlanmış buy'lar sell edilmemiş)
              const { data: openPositions } = await supabase
                .from('trade_orders')
                .select('token_address')
                .eq('user_id', settings.user_id)
                .eq('order_type', 'buy')
                .eq('status', 'completed');
              
              const openTokens = new Set((openPositions || []).map(p => p.token_address));

              for (const signal of (activeSignals || [])) {
                // Günlük limit kontrolü (her trade sonrası)
                if (settings.daily_sol_used >= settings.max_daily_sol) break;

                // === AUTO BUY ===
                if (signal.signal_type === 'buy' && settings.auto_buy_enabled) {
                  if (signal.confidence_score < settings.min_confidence_buy) continue;
                  if (openTokens.size >= settings.max_open_positions) continue;
                  if (openTokens.has(signal.token_address)) continue; // Zaten pozisyon var
                  if (wallet.sol_balance < settings.max_sol_per_trade) continue;

                  const tradeAmount = Math.min(
                    settings.max_sol_per_trade,
                    settings.max_daily_sol - settings.daily_sol_used,
                    wallet.sol_balance * 0.9 // %90'dan fazla kullanma
                  );

                  if (tradeAmount < 0.005) continue;

                  console.log(`🟢 AUTO BUY: ${signal.token_symbol} | ${tradeAmount} SOL | Güven: ${signal.confidence_score}%`);

                  // Blockchain'de swap yap, SADECE başarılıysa kaydet
                  try {
                    const SOL_MINT = 'So11111111111111111111111111111111111111112';
                    const amountLamports = Math.floor(tradeAmount * 1e9);

                    const quoteRes = await fetch(
                      `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${signal.token_address}&amount=${amountLamports}&slippageBps=300`
                    );
                    const quote = await quoteRes.json();
                    if (quote.error) throw new Error(quote.error);

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
                    if (swapData.error) throw new Error(swapData.error);

                    const sendRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jsonrpc: '2.0', id: 1,
                        method: 'sendTransaction',
                        params: [swapData.swapTransaction, { encoding: 'base64' }],
                      }),
                    });
                    const sendData = await sendRes.json();
                    if (sendData.error) throw new Error(sendData.error.message);

                    // ✅ İşlem blockchain'de başarılı — şimdi kaydet
                    await supabase.from('trade_orders').insert({
                      user_id: settings.user_id,
                      wallet_id: wallet.id,
                      token_address: signal.token_address,
                      token_symbol: signal.token_symbol,
                      order_type: 'buy',
                      amount_sol: tradeAmount,
                      status: 'completed',
                      tx_signature: sendData.result,
                      price_at_trade: quote.outAmount ? Number(quote.outAmount) / 1e6 : null,
                    });

                    // Bakiye ve günlük kullanım güncelle
                    settings.daily_sol_used += tradeAmount;
                    wallet.sol_balance -= tradeAmount;
                    await supabase.from('user_wallets').update({ sol_balance: Math.max(0, wallet.sol_balance) }).eq('id', wallet.id);
                    await supabase.from('auto_trade_settings').update({ daily_sol_used: settings.daily_sol_used }).eq('id', settings.id);

                    openTokens.add(signal.token_address);
                    autoTradeResults.push({ user: settings.user_id.slice(0, 8), type: 'buy', token: signal.token_symbol, amount: tradeAmount, status: 'completed' });
                    console.log(`✅ AUTO BUY tamamlandı: ${signal.token_symbol} | ${tradeAmount} SOL | tx: ${sendData.result}`);

                  } catch (tradeErr) {
                    // ❌ Başarısız — veritabanına HİÇBİR ŞEY kaydetme
                    autoTradeResults.push({ user: settings.user_id.slice(0, 8), type: 'buy', token: signal.token_symbol, amount: tradeAmount, status: 'failed', error: String(tradeErr) });
                    console.error(`❌ AUTO BUY hata (kayıt oluşturulmadı): ${signal.token_symbol}:`, tradeErr);
                  }
                }

                // === AUTO SELL ===
                if (signal.signal_type === 'sell' && settings.auto_sell_enabled) {
                  if (signal.confidence_score < settings.min_confidence_sell) continue;
                  if (!openTokens.has(signal.token_address)) continue; // Pozisyon yoksa satma

                  // Bu token'dan ne kadar aldığımızı bul
                  const { data: buyOrder } = await supabase
                    .from('trade_orders')
                    .select('amount_sol')
                    .eq('user_id', settings.user_id)
                    .eq('token_address', signal.token_address)
                    .eq('order_type', 'buy')
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                  const sellAmount = buyOrder?.amount_sol || settings.max_sol_per_trade;

                  console.log(`🔴 AUTO SELL: ${signal.token_symbol} | ~${sellAmount} SOL | Güven: ${signal.confidence_score}%`);

                  try {
                    const SOL_MINT = 'So11111111111111111111111111111111111111112';
                    const amountLamports = Math.floor(sellAmount * 1e9);

                    const quoteRes = await fetch(
                      `https://quote-api.jup.ag/v6/quote?inputMint=${signal.token_address}&outputMint=${SOL_MINT}&amount=${amountLamports}&slippageBps=500`
                    );
                    const quote = await quoteRes.json();
                    if (quote.error) throw new Error(quote.error);

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
                    if (swapData.error) throw new Error(swapData.error);

                    const sendRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jsonrpc: '2.0', id: 1,
                        method: 'sendTransaction',
                        params: [swapData.swapTransaction, { encoding: 'base64' }],
                      }),
                    });
                    const sendData = await sendRes.json();
                    if (sendData.error) throw new Error(sendData.error.message);

                    // ✅ İşlem blockchain'de başarılı — şimdi kaydet
                    await supabase.from('trade_orders').insert({
                      user_id: settings.user_id,
                      wallet_id: wallet.id,
                      token_address: signal.token_address,
                      token_symbol: signal.token_symbol,
                      order_type: 'sell',
                      amount_sol: sellAmount,
                      status: 'completed',
                      tx_signature: sendData.result,
                    });

                    wallet.sol_balance += sellAmount;
                    await supabase.from('user_wallets').update({ sol_balance: wallet.sol_balance }).eq('id', wallet.id);

                    openTokens.delete(signal.token_address);
                    autoTradeResults.push({ user: settings.user_id.slice(0, 8), type: 'sell', token: signal.token_symbol, amount: sellAmount, status: 'completed' });
                    console.log(`✅ AUTO SELL tamamlandı: ${signal.token_symbol} | tx: ${sendData.result}`);

                  } catch (tradeErr) {
                    // ❌ Başarısız — veritabanına HİÇBİR ŞEY kaydetme
                    autoTradeResults.push({ user: settings.user_id.slice(0, 8), type: 'sell', token: signal.token_symbol, status: 'failed', error: String(tradeErr) });
                    console.error(`❌ AUTO SELL hata (kayıt oluşturulmadı): ${signal.token_symbol}:`, tradeErr);
                  }
                }
              }
            } catch (userErr) {
              console.error(`❌ Auto-trade kullanıcı hatası ${settings.user_id.slice(0, 8)}:`, userErr);
            }
          }
          console.log(`🤖 Auto-trade tamamlandı: ${autoTradeResults.length} işlem`);
        }
      } catch (autoErr) {
        console.error('❌ Auto-trade genel hata:', autoErr);
      }

      return new Response(JSON.stringify({
        success: true,
        scannedCount: results.length,
        results,
        autoTrades: autoTradeResults,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== WHALE CÜZDANLARI GÜNCELLE =====
    if (action === 'sync-whales') {
      console.log('🐋 Whale cüzdanları güncelleniyor...');
      
      const labels: Record<string, string> = {
        "CTV3h6MdZQYjmAjBdCnVGD2bZb8VbYpFEHkqH45mHNcN": "Wintermute",
        "MEVgKbG37LLBuHPYMRZB8CpkGvd5VNWbRHsEE3wMFmu": "Jump Trading",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM": "Alameda",
        "7rhxnLV8C76MrBFhFnhLReqSmMXXiY3UaFqchPXz7soZ": "Smart Money #1",
        "DYw8jCTdBNt8jwfn6Ts5KBxLB3HLKFGMghXJYhEpB5sK": "Smart Money #2",
        "FDqHnZKzsBKYRCpRnXumMWpDraFTDfYGnRXKzeRmqBYp": "Smart Money #3",
        "3BMNC8ypBW1Fz9wfyUo4dFUp8iGcakzJGv14og9bLDZH": "Smart Money #4",
        "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9": "Smart Money #5",
        "JCNCMFXo5M68qVs4Qhb4RNdEhFJG1VwTLQ5vGhmXdhr": "Drift Whale",
        "4dMKjzu4u1P43Vdhv1nHvJmZyBch1fBNJKBP3YLG7oaD": "DeFi Whale #1",
        "6SBx89NbeGBTaKPULm89P1tqWnST9TCPZy4UXqJiYhQi": "DeFi Whale #2",
        "HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwYKCSfYVunpR": "DeFi Whale #3",
        "3tBKR7vZ3WKWcQiPvT8yVi9EzFRMxECNe7vXbFm7dPFN": "Top Trader #1",
        "Enw6c1fPz4MufXLB7u95XHEyhwjjLBRFMCB79MJcRpb3": "Top Trader #2",
        "8rvwEMJB7qcSbKm1cMGU9tpNKbqgFjSo2hHPUzsiDVhG": "Top Trader #3",
      };

      for (const wallet of TOP_WHALE_WALLETS) {
        await supabase.from('tracked_wallets').upsert({
          address: wallet,
          label: labels[wallet] || `Whale ${wallet.slice(0, 6)}`,
          is_whale: true,
        }, { onConflict: 'address' });
      }

      // Whale işlemlerini çek
      let totalTx = 0;
      for (const wallet of TOP_WHALE_WALLETS.slice(0, 5)) {
        try {
          const transactions = await getWalletTransactions(wallet, 20);
          const { data: walletData } = await supabase
            .from('tracked_wallets')
            .select('id')
            .eq('address', wallet)
            .single();

          if (walletData) {
            for (const tx of transactions) {
              if (tx.tokenAddress) {
                const tokenInfo = await getTokenInfo(tx.tokenAddress);
                await supabase.from('wallet_transactions').upsert({
                  wallet_id: walletData.id,
                  token_address: tx.tokenAddress,
                  token_symbol: tokenInfo?.baseToken?.symbol || null,
                  transaction_type: tx.type === 'SWAP' ? 'buy' : 'sell',
                  signature: tx.signature,
                  block_time: new Date(tx.timestamp * 1000).toISOString(),
                }, { onConflict: 'signature' });
                totalTx++;
              }
            }
          }
          await new Promise(r => setTimeout(r, 300));
        } catch (error) {
          console.error(`Error syncing wallet ${wallet}:`, error);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        walletsAdded: TOP_WHALE_WALLETS.length,
        transactionsSynced: totalTx,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== TEK TOKEN ANALİZİ =====
    if (action === 'analyze-token') {
      const { tokenAddress } = body;
      const tokenInfo = await getTokenInfo(tokenAddress);
      const tokenSymbol = tokenInfo?.baseToken?.symbol || null;

      const [botAnalysis, whaleAnalysis, holders] = await Promise.all([
        detectBotActivity(tokenAddress),
        checkWhaleInterest(tokenAddress, supabase),
        getTokenHolders(tokenAddress),
      ]);

      const totalSupply = holders.reduce((sum: number, h: any) => sum + parseFloat(h.amount || '0'), 0);
      const top10Supply = holders.slice(0, 10).reduce((sum: number, h: any) => sum + parseFloat(h.amount || '0'), 0);
      const top10Percentage = totalSupply > 0 ? (top10Supply / totalSupply) * 100 : 0;

      const riskScore = Math.min(
        botAnalysis.botScore * 0.4 +
        (top10Percentage > 50 ? 30 : top10Percentage > 30 ? 15 : 0) +
        (whaleAnalysis.whalesInterested === 0 ? 20 : 0),
        100
      );

      await supabase.from('token_analysis').insert({
        token_address: tokenAddress,
        token_symbol: tokenSymbol,
        holder_count: holders.length,
        top_10_holder_percentage: top10Percentage,
        bot_transaction_percentage: botAnalysis.botScore,
        risk_score: riskScore,
      });

      if (whaleAnalysis.whalesInterested >= 2 && botAnalysis.botScore < 30) {
        await supabase.from('bot_signals').insert({
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          signal_type: 'buy',
          confidence_score: Math.max(0, 100 - riskScore),
          reason: `${whaleAnalysis.whalesInterested} whale alım yaptı, düşük bot aktivitesi`,
          whale_wallets_buying: whaleAnalysis.whalesInterested,
          bot_activity_score: botAnalysis.botScore,
          liquidity_usd: tokenInfo?.liquidity?.usd || 0,
          volume_24h: tokenInfo?.volume?.h24 || 0,
        });
      } else if (botAnalysis.botScore > 70) {
        await supabase.from('bot_signals').insert({
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          signal_type: 'sell',
          confidence_score: botAnalysis.botScore,
          reason: 'Yüksek bot aktivitesi - potansiyel rug pull',
          bot_activity_score: botAnalysis.botScore,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        analysis: {
          tokenSymbol,
          botScore: botAnalysis.botScore,
          isBotHeavy: botAnalysis.isBotHeavy,
          whalesInterested: whaleAnalysis.whalesInterested,
          whaleWallets: whaleAnalysis.whaleWallets,
          holderCount: holders.length,
          top10Percentage,
          riskScore,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== SİNYALLERİ GETİR =====
    if (action === 'get-signals') {
      const { data: signals } = await supabase
        .from('bot_signals')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ success: true, signals }), {
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