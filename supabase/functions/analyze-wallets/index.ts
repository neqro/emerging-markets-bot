import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HELIUS_API_KEY = Deno.env.get('HELIUS_API_KEY');
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

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

// DexScreener'dan yeni Solana token'larını al
async function getNewSolanaTokens(): Promise<string[]> {
  try {
    const res = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
    const profiles = await res.json();
    
    return profiles
      .filter((p: any) => p.chainId === 'solana')
      .slice(0, 15)
      .map((p: any) => p.tokenAddress);
  } catch (error) {
    console.error('Error fetching new tokens:', error);
    return [];
  }
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

    const body = await req.json();
    const { action } = body;

    // ===== OTOMATİK TARAMA =====
    if (action === 'auto-scan') {
      console.log('🔍 Otomatik tarama başlatılıyor...');
      
      const tokenAddresses = await getNewSolanaTokens();
      console.log(`📋 ${tokenAddresses.length} yeni token bulundu`);
      
      const results = [];
      
      for (const tokenAddress of tokenAddresses) {
        try {
          // Daha önce analiz edilmiş mi kontrol et
          const { data: existing } = await supabase
            .from('token_analysis')
            .select('id')
            .eq('token_address', tokenAddress)
            .gte('analyzed_at', new Date(Date.now() - 3600000).toISOString()) // son 1 saat
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

          // Sinyal mantığı — her token için sinyal üret
          let signalType: string = 'watch';
          let reason = '';
          let confidence = 0;
          const priceChange1h = tokenInfo?.priceChange?.h1 || 0;
          const txnsBuys = tokenInfo?.txns?.h1?.buys || 0;
          const txnsSells = tokenInfo?.txns?.h1?.sells || 0;
          const buyPressure = txnsBuys + txnsSells > 0 ? (txnsBuys / (txnsBuys + txnsSells)) * 100 : 50;

          if (whaleAnalysis.whalesInterested >= 2 && botAnalysis.botScore < 30 && riskScore < 40) {
            signalType = 'buy';
            confidence = Math.max(60, 100 - riskScore);
            reason = `🐋 ${whaleAnalysis.whalesInterested} whale alım yaptı | Bot: ${botAnalysis.botScore}% | Liq: $${(liquidity / 1000).toFixed(1)}K`;
          } else if (whaleAnalysis.whalesInterested >= 1 && botAnalysis.botScore < 50) {
            signalType = 'buy';
            confidence = Math.max(50, 80 - riskScore);
            reason = `👀 ${whaleAnalysis.whalesInterested} whale ilgileniyor | Risk: ${riskScore.toFixed(0)}% | Vol: $${(volume24h / 1000).toFixed(1)}K`;
          } else if (botAnalysis.botScore > 70) {
            signalType = 'sell';
            confidence = botAnalysis.botScore;
            reason = `🤖 Yüksek bot aktivitesi (${botAnalysis.botScore}%) | Top10: ${top10Percentage.toFixed(0)}% | RUG RİSKİ`;
          } else if (botAnalysis.botScore > 40 && top10Percentage > 60) {
            signalType = 'sell';
            confidence = Math.min(botAnalysis.botScore + 20, 90);
            reason = `⚠️ Bot: ${botAnalysis.botScore}% | Top10: ${top10Percentage.toFixed(0)}% sahiplik | Dikkatli ol`;
          } else if (riskScore < 40 && liquidity > 10000 && buyPressure > 55) {
            signalType = 'buy';
            confidence = Math.max(40, 85 - riskScore);
            reason = `📈 Alım baskısı %${buyPressure.toFixed(0)} | Risk: ${riskScore.toFixed(0)}% | Liq: $${(liquidity / 1000).toFixed(1)}K`;
          } else if (riskScore < 50 && volume24h > 50000) {
            signalType = 'watch';
            confidence = Math.max(35, 70 - riskScore);
            reason = `📊 Yüksek hacim $${(volume24h / 1000).toFixed(1)}K | Risk: ${riskScore.toFixed(0)}% | ${priceChange1h > 0 ? '↑' : '↓'}${Math.abs(priceChange1h).toFixed(1)}% 1h`;
          } else if (riskScore >= 50) {
            signalType = 'sell';
            confidence = Math.min(riskScore, 85);
            reason = `🔴 Yüksek risk (${riskScore.toFixed(0)}%) | Bot: ${botAnalysis.botScore}% | Top10: ${top10Percentage.toFixed(0)}%`;
          } else {
            signalType = 'watch';
            confidence = Math.max(20, 50 - riskScore);
            reason = `👁️ İzleniyor | Risk: ${riskScore.toFixed(0)}% | Liq: $${(liquidity / 1000).toFixed(1)}K | Vol: $${(volume24h / 1000).toFixed(1)}K`;
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

      return new Response(JSON.stringify({
        success: true,
        scannedCount: results.length,
        results,
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

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});