import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HELIUS_API_KEY = Deno.env.get('HELIUS_API_KEY');
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

interface WalletTransaction {
  signature: string;
  type: string;
  tokenAddress?: string;
  amount?: number;
  timestamp: number;
}

// Top whale wallets (örnek - gerçek projede dinamik olarak güncellenebilir)
const TOP_WHALE_WALLETS = [
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // örnek
  "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
  "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crLCEgFLBn",
];

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

async function getWalletTransactions(walletAddress: string): Promise<WalletTransaction[]> {
  try {
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=50`);
    const data = await response.json();
    
    return data.map((tx: any) => ({
      signature: tx.signature,
      type: tx.type,
      tokenAddress: tx.tokenTransfers?.[0]?.mint,
      amount: tx.tokenTransfers?.[0]?.tokenAmount,
      timestamp: tx.timestamp,
    }));
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return [];
  }
}

async function detectBotActivity(tokenAddress: string): Promise<{ isBotHeavy: boolean; botScore: number }> {
  try {
    // Token'ın son işlemlerini al
    const response = await fetch(`https://api.helius.xyz/v0/tokens/${tokenAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=100`);
    const transactions = await response.json();
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { isBotHeavy: false, botScore: 0 };
    }

    // Bot tespiti kriterleri
    const walletFrequency: Record<string, number> = {};
    let rapidTrades = 0;
    let prevTimestamp = 0;

    for (const tx of transactions) {
      const wallet = tx.feePayer;
      walletFrequency[wallet] = (walletFrequency[wallet] || 0) + 1;
      
      // Çok hızlı işlemler (10 saniye içinde)
      if (prevTimestamp && tx.timestamp - prevTimestamp < 10) {
        rapidTrades++;
      }
      prevTimestamp = tx.timestamp;
    }

    // Aynı cüzdandan çok fazla işlem = potansiyel bot
    const maxTrades = Math.max(...Object.values(walletFrequency));
    const uniqueWallets = Object.keys(walletFrequency).length;
    
    // Bot skoru hesapla (0-100)
    const repeatTradeScore = Math.min((maxTrades / 10) * 30, 30);
    const rapidTradeScore = Math.min((rapidTrades / 20) * 40, 40);
    const lowDiversityScore = uniqueWallets < 20 ? 30 : 0;
    
    const botScore = repeatTradeScore + rapidTradeScore + lowDiversityScore;
    
    return {
      isBotHeavy: botScore > 50,
      botScore: Math.round(botScore),
    };
  } catch (error) {
    console.error('Error detecting bot activity:', error);
    return { isBotHeavy: false, botScore: 0 };
  }
}

async function checkWhaleInterest(tokenAddress: string): Promise<{ whalesInterested: number; whaleWallets: string[] }> {
  const interestedWhales: string[] = [];
  
  for (const whale of TOP_WHALE_WALLETS) {
    try {
      const transactions = await getWalletTransactions(whale);
      const hasBought = transactions.some(tx => 
        tx.tokenAddress === tokenAddress && tx.type === 'SWAP'
      );
      
      if (hasBought) {
        interestedWhales.push(whale);
      }
    } catch (error) {
      console.error(`Error checking whale ${whale}:`, error);
    }
  }
  
  return {
    whalesInterested: interestedWhales.length,
    whaleWallets: interestedWhales,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, tokenAddress, walletAddress } = await req.json();

    if (action === 'analyze-token') {
      // Token analizi
      const [botAnalysis, whaleAnalysis, holders] = await Promise.all([
        detectBotActivity(tokenAddress),
        checkWhaleInterest(tokenAddress),
        getTokenHolders(tokenAddress),
      ]);

      // Top 10 holder yüzdesi hesapla
      const totalSupply = holders.reduce((sum: number, h: any) => sum + parseFloat(h.amount), 0);
      const top10Supply = holders.slice(0, 10).reduce((sum: number, h: any) => sum + parseFloat(h.amount), 0);
      const top10Percentage = totalSupply > 0 ? (top10Supply / totalSupply) * 100 : 0;

      // Risk skoru hesapla
      const riskScore = Math.min(
        botAnalysis.botScore * 0.4 +
        (top10Percentage > 50 ? 30 : top10Percentage > 30 ? 15 : 0) +
        (whaleAnalysis.whalesInterested === 0 ? 20 : 0),
        100
      );

      // Veritabanına kaydet
      await supabase.from('token_analysis').insert({
        token_address: tokenAddress,
        holder_count: holders.length,
        top_10_holder_percentage: top10Percentage,
        bot_transaction_percentage: botAnalysis.botScore,
        risk_score: riskScore,
      });

      // Sinyal oluştur
      if (whaleAnalysis.whalesInterested >= 2 && botAnalysis.botScore < 30) {
        await supabase.from('bot_signals').insert({
          token_address: tokenAddress,
          signal_type: 'buy',
          confidence_score: Math.max(0, 100 - riskScore),
          reason: `${whaleAnalysis.whalesInterested} whale wallet alım yaptı, düşük bot aktivitesi`,
          whale_wallets_buying: whaleAnalysis.whalesInterested,
          bot_activity_score: botAnalysis.botScore,
        });
      } else if (botAnalysis.botScore > 70) {
        await supabase.from('bot_signals').insert({
          token_address: tokenAddress,
          signal_type: 'sell',
          confidence_score: botAnalysis.botScore,
          reason: 'Yüksek bot aktivitesi tespit edildi - potansiyel rug pull',
          bot_activity_score: botAnalysis.botScore,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        analysis: {
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

    if (action === 'track-wallet') {
      // Cüzdan takibe al
      const transactions = await getWalletTransactions(walletAddress);
      
      // Cüzdanı kaydet
      const { data: wallet } = await supabase
        .from('tracked_wallets')
        .upsert({ address: walletAddress, is_whale: true })
        .select()
        .single();

      // İşlemleri kaydet
      for (const tx of transactions.slice(0, 20)) {
        if (tx.tokenAddress) {
          await supabase.from('wallet_transactions').upsert({
            wallet_id: wallet.id,
            token_address: tx.tokenAddress,
            transaction_type: tx.type === 'SWAP' ? 'buy' : 'sell',
            signature: tx.signature,
            block_time: new Date(tx.timestamp * 1000).toISOString(),
          }, { onConflict: 'signature' });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        wallet,
        transactionCount: transactions.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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