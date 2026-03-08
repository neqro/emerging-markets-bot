import { TrendingUp, TrendingDown, BarChart3, ExternalLink, RefreshCw } from "lucide-react";
import { PanelHeader } from "./PanelHeader";
import { usePositions, Position } from "@/hooks/usePositions";
import { Skeleton } from "@/components/ui/skeleton";

const MiniSparkline = ({ data, isPositive }: { data: number[]; isPositive: boolean }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "hsl(var(--chart-up))" : "hsl(var(--chart-down))"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const PositionRow = ({ pos }: { pos: Position }) => {
  const isPositive = pos.pnl_sol >= 0;

  return (
    <div className="rounded-lg bg-secondary/30 border border-border p-2.5 space-y-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${isPositive ? 'bg-[hsl(var(--chart-up))]' : 'bg-[hsl(var(--chart-down))]'}`} />
          <span className="text-xs font-mono font-semibold text-foreground">
            {pos.token_symbol || pos.token_address.slice(0, 6)}
          </span>
          <a
            href={`https://dexscreener.com/solana/${pos.token_address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
        <MiniSparkline data={pos.price_history} isPositive={isPositive} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 text-[9px]">
        <div>
          <div className="text-muted-foreground uppercase tracking-wider">Pozisyon</div>
          <div className="text-foreground font-mono">{pos.current_value_sol.toFixed(4)} SOL</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider">Maliyet</div>
          <div className="text-foreground font-mono">{pos.total_bought_sol.toFixed(4)} SOL</div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground uppercase tracking-wider">PnL</div>
          <div className={`font-mono font-semibold ${isPositive ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'}`}>
            {isPositive ? "+" : ""}{pos.pnl_sol.toFixed(4)} SOL
          </div>
        </div>
      </div>

      {/* PnL bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isPositive ? 'bg-[hsl(var(--chart-up))]' : 'bg-[hsl(var(--chart-down))]'}`}
          style={{ width: `${Math.min(Math.abs(pos.pnl_percent), 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[8px]">
        <span className="text-muted-foreground">
          {pos.current_price ? `$${pos.current_price.toFixed(8)}` : "Fiyat yok"}
        </span>
        <span className={`font-mono ${isPositive ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'}`}>
          {isPositive ? "+" : ""}{pos.pnl_percent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

export const PositionsPanel = () => {
  const { positions, loading, totalPnl, refetch } = usePositions();
  const isPositive = totalPnl >= 0;

  return (
    <>
      <PanelHeader
        icon={BarChart3}
        title="Pozisyonlar"
        badge={positions.length > 0 ? `${positions.length} açık` : undefined}
      />

      {/* Total PnL summary */}
      {positions.length > 0 && (
        <div className="mt-2 rounded-lg bg-secondary/50 border border-border px-3 py-2 flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Toplam PnL</div>
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-[hsl(var(--chart-up))]" />
            ) : (
              <TrendingDown className="h-3 w-3 text-[hsl(var(--chart-down))]" />
            )}
            <span className={`text-sm font-mono font-bold ${isPositive ? 'text-[hsl(var(--chart-up))]' : 'text-[hsl(var(--chart-down))]'}`}>
              {isPositive ? "+" : ""}{totalPnl.toFixed(4)} SOL
            </span>
            <button onClick={refetch} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 mt-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Henüz açık pozisyon yok<br />Auto-trade aktifleşince burası dolacak
            </p>
          </div>
        ) : (
          positions.map((pos) => (
            <PositionRow key={pos.token_address} pos={pos} />
          ))
        )}
      </div>
    </>
  );
};
