import { ExternalLink, TrendingDown, TrendingUp, ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { type TokenPair, formatUsd, formatNumber, timeAgo } from "@/lib/dexscreener";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TokenCardProps {
  pair: TokenPair;
}

export const TokenCard = ({ pair }: TokenCardProps) => {
  const priceChange = pair.priceChange?.h1 ?? 0;
  const isUp = priceChange >= 0;

  const { data: analysis } = useQuery({
    queryKey: ["token-risk", pair.baseToken.address],
    queryFn: async () => {
      const { data } = await supabase
        .from("token_analysis")
        .select("risk_score, bot_transaction_percentage, top_10_holder_percentage")
        .eq("token_address", pair.baseToken.address)
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    staleTime: 60000,
  });

  const riskScore = analysis?.risk_score ? Number(analysis.risk_score) : null;
  const botScore = analysis?.bot_transaction_percentage ? Number(analysis.bot_transaction_percentage) : null;

  const getRiskStyle = (score: number) => {
    if (score >= 60) return { border: "border-[hsl(var(--chart-down))]/50", badge: "bg-[hsl(var(--chart-down))]/15 text-down", icon: ShieldAlert, label: "HIGH" };
    if (score >= 35) return { border: "border-accent/30", badge: "bg-accent/15 text-accent", icon: Shield, label: "MED" };
    return { border: "border-[hsl(var(--chart-up))]/30", badge: "bg-[hsl(var(--chart-up))]/15 text-up", icon: ShieldCheck, label: "LOW" };
  };

  const risk = riskScore !== null ? getRiskStyle(riskScore) : null;
  const RiskIcon = risk?.icon;

  return (
    <div className={`group p-3 rounded-lg bg-secondary/50 border transition-all animate-slide-up ${
      risk ? risk.border : "border-border hover:border-primary/30"
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {pair.info?.imageUrl ? (
            <img
              src={pair.info.imageUrl}
              alt={pair.baseToken.symbol}
              className="h-7 w-7 rounded-full bg-muted"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {pair.baseToken.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-display font-semibold text-foreground">
                {pair.baseToken.symbol}
              </span>
              <span className="text-[10px] text-muted-foreground">
                /{pair.quoteToken.symbol}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {pair.baseToken.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {risk && RiskIcon && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${risk.badge}`}>
              <RiskIcon className="h-3 w-3" />
              {risk.label} {riskScore?.toFixed(0)}
            </div>
          )}
          <a
            href={pair.url}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-muted-foreground">Price</span>
          <p className="font-mono text-foreground">{formatUsd(parseFloat(pair.priceUsd || "0"))}</p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">1h</span>
          <p className={`font-mono flex items-center justify-end gap-0.5 ${isUp ? "text-up" : "text-down"}`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {priceChange.toFixed(2)}%
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Liq</span>
          <p className="font-mono text-foreground">{formatUsd(pair.liquidity?.usd)}</p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground">Vol 24h</span>
          <p className="font-mono text-foreground">{formatUsd(pair.volume?.h24)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Txns 1h</span>
          <p className="font-mono text-foreground">
            <span className="text-up">{pair.txns?.h1?.buys ?? 0}</span>
            {" / "}
            <span className="text-down">{pair.txns?.h1?.sells ?? 0}</span>
          </p>
        </div>
        <div className="text-right">
          {botScore !== null ? (
            <>
              <span className="text-muted-foreground">Bot</span>
              <p className={`font-mono ${botScore > 50 ? "text-down" : botScore > 20 ? "text-accent" : "text-up"}`}>
                🤖 {botScore.toFixed(0)}%
              </p>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Age</span>
              <p className="font-mono text-foreground">{timeAgo(pair.pairCreatedAt)}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};