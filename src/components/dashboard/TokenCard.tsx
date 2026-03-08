import { ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import { type TokenPair, formatUsd, formatNumber, timeAgo } from "@/lib/dexscreener";

interface TokenCardProps {
  pair: TokenPair;
}

export const TokenCard = ({ pair }: TokenCardProps) => {
  const priceChange = pair.priceChange?.h1 ?? 0;
  const isUp = priceChange >= 0;

  return (
    <div className="group p-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-all animate-slide-up">
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
        <a
          href={pair.url}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
        </a>
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
          <span className="text-muted-foreground">Age</span>
          <p className="font-mono text-foreground">{timeAgo(pair.pairCreatedAt)}</p>
        </div>
      </div>
    </div>
  );
};
