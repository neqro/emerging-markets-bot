import { Radio, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { PanelHeader } from "./PanelHeader";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Signal {
  id: string;
  type: "buy" | "sell" | "watch";
  token: string;
  reason: string;
  confidence: number;
  time: string;
}

// Mock signals - will be replaced by real bot logic
const mockSignals: Signal[] = [
  { id: "1", type: "buy", token: "BRETT", reason: "Top 5 wallets accumulating", confidence: 82, time: "2m ago" },
  { id: "2", type: "watch", token: "DEGEN", reason: "Volume spike +340%", confidence: 65, time: "5m ago" },
  { id: "3", type: "buy", token: "TOSHI", reason: "3 whale wallets bought", confidence: 78, time: "8m ago" },
  { id: "4", type: "sell", token: "NORMIE", reason: "Liquidity dropping fast", confidence: 71, time: "12m ago" },
  { id: "5", type: "watch", token: "AERO", reason: "New pair, high initial liq", confidence: 60, time: "15m ago" },
];

const signalColors = {
  buy: "text-up bg-[hsl(var(--chart-up))]/10 border-[hsl(var(--chart-up))]/20",
  sell: "text-down bg-[hsl(var(--chart-down))]/10 border-[hsl(var(--chart-down))]/20",
  watch: "text-accent bg-accent/10 border-accent/20",
};

const SignalIcon = ({ type }: { type: Signal["type"] }) => {
  if (type === "buy") return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (type === "sell") return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
};

export const SignalsPanel = () => {
  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Bot Signals" icon={Radio} count={mockSignals.length} accent="accent" />
      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-2 pb-2">
          {mockSignals.map((signal) => (
            <div
              key={signal.id}
              className={`p-3 rounded-lg border animate-slide-up ${signalColors[signal.type]}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <SignalIcon type={signal.type} />
                  <span className="text-xs font-display font-semibold uppercase">
                    {signal.type}
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    ${signal.token}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{signal.time}</span>
              </div>
              <p className="text-[11px] text-secondary-foreground mb-1.5">{signal.reason}</p>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-current transition-all"
                    style={{ width: `${signal.confidence}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono">{signal.confidence}%</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
