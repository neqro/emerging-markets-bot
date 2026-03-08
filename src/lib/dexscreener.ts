// DexScreener public API for Solana chain
const BASE_URL = "https://api.dexscreener.com";
const BASE_CHAIN = "solana";

export interface TokenPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { type: string; url: string }[];
  };
}

export async function getNewTokenPairs(): Promise<TokenPair[]> {
  try {
    const res = await fetch(`${BASE_URL}/token-profiles/latest/v1`);
    if (!res.ok) throw new Error("Failed to fetch token profiles");
    const profiles = await res.json();
    
    // Filter for Base chain tokens and get their pair data
    const baseTokens = profiles
      .filter((p: any) => p.chainId === BASE_CHAIN)
      .slice(0, 20);
    
    if (baseTokens.length === 0) return [];
    
    const addresses = baseTokens.map((t: any) => t.tokenAddress).join(",");
    const pairsRes = await fetch(`${BASE_URL}/tokens/v1/${BASE_CHAIN}/${addresses}`);
    if (!pairsRes.ok) throw new Error("Failed to fetch pairs");
    
    return await pairsRes.json();
  } catch (err) {
    console.error("DexScreener API error:", err);
    return [];
  }
}

export async function getTrendingTokens(): Promise<TokenPair[]> {
  try {
    const res = await fetch(`${BASE_URL}/token-boosts/top/v1`);
    if (!res.ok) throw new Error("Failed to fetch trending");
    const boosts = await res.json();
    
    const baseBoosts = boosts
      .filter((b: any) => b.chainId === BASE_CHAIN)
      .slice(0, 10);
    
    if (baseBoosts.length === 0) return [];
    
    const addresses = baseBoosts.map((t: any) => t.tokenAddress).join(",");
    const pairsRes = await fetch(`${BASE_URL}/tokens/v1/${BASE_CHAIN}/${addresses}`);
    if (!pairsRes.ok) throw new Error("Failed to fetch pairs");
    
    return await pairsRes.json();
  } catch (err) {
    console.error("DexScreener trending error:", err);
    return [];
  }
}

export async function searchTokens(query: string): Promise<TokenPair[]> {
  try {
    const res = await fetch(`${BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search");
    const data = await res.json();
    return (data.pairs || []).filter((p: TokenPair) => p.chainId === BASE_CHAIN);
  } catch (err) {
    console.error("DexScreener search error:", err);
    return [];
  }
}

export function formatUsd(value: number | undefined): string {
  if (!value) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatNumber(value: number | undefined): string {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function timeAgo(timestamp: number | undefined): string {
  if (!timestamp) return "N/A";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
