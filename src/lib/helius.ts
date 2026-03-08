import { supabase } from "@/integrations/supabase/client";

export interface TokenAnalysis {
  botScore: number;
  isBotHeavy: boolean;
  whalesInterested: number;
  whaleWallets: string[];
  holderCount: number;
  top10Percentage: number;
  riskScore: number;
}

export interface BotSignal {
  id: string;
  token_address: string;
  token_symbol: string | null;
  signal_type: 'buy' | 'sell' | 'watch';
  confidence_score: number | null;
  reason: string | null;
  whale_wallets_buying: number;
  bot_activity_score: number;
  liquidity_usd: number | null;
  volume_24h: number | null;
  is_active: boolean;
  created_at: string;
}

export async function analyzeToken(tokenAddress: string): Promise<TokenAnalysis | null> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-wallets', {
      body: { action: 'analyze-token', tokenAddress },
    });

    if (error) throw error;
    return data.analysis;
  } catch (error) {
    console.error('Error analyzing token:', error);
    return null;
  }
}

export async function trackWallet(walletAddress: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-wallets', {
      body: { action: 'track-wallet', walletAddress },
    });

    if (error) throw error;
    return data.success;
  } catch (error) {
    console.error('Error tracking wallet:', error);
    return false;
  }
}

export async function getBotSignals(): Promise<BotSignal[]> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-wallets', {
      body: { action: 'get-signals' },
    });

    if (error) throw error;
    return data.signals || [];
  } catch (error) {
    console.error('Error fetching signals:', error);
    return [];
  }
}

// Risk seviyesi rengi
export function getRiskColor(riskScore: number): string {
  if (riskScore < 30) return 'text-up';
  if (riskScore < 60) return 'text-warning';
  return 'text-down';
}

// Bot skoru açıklaması
export function getBotScoreLabel(score: number): string {
  if (score < 20) return 'Düşük Bot Aktivitesi';
  if (score < 50) return 'Orta Bot Aktivitesi';
  if (score < 70) return 'Yüksek Bot Aktivitesi';
  return 'Çok Yüksek Bot Aktivitesi';
}