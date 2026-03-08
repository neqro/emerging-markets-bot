import { Eye, Wallet } from "lucide-react";
import { PanelHeader } from "./PanelHeader";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WalletActivity {
  id: string;
  wallet: string;
  action: "buy" | "sell";
  token: string;
  amount: string;
  time: string;
}

// Mock data - will be replaced when backend is connected
const mockActivity: WalletActivity[] = [
  { id: "1", wallet: "0x1a2b...3c4d", action: "buy", token: "BRETT", amount: "$12.4K", time: "1m" },
  { id: "2", wallet: "0x5e6f...7g8h", action: "buy", token: "TOSHI", amount: "$8.2K", time: "3m" },
  { id: "3", wallet: "0x9i0j...1k2l", action: "sell", token: "NORMIE", amount: "$5.1K", time: "4m" },
  { id: "4", wallet: "0x3m4n...5o6p", action: "buy", token: "DEGEN", amount: "$22.8K", time: "6m" },
  { id: "5", wallet: "0x7q8r...9s0t", action: "buy", token: "AERO", amount: "$15.6K", time: "8m" },
  { id: "6", wallet: "0xu1v2...w3x4", action: "sell", token: "VIRTUAL", amount: "$9.3K", time: "10m" },
  { id: "7", wallet: "0x1a2b...3c4d", action: "buy", token: "HIGHER", amount: "$6.7K", time: "12m" },
];

export const WalletTrackerPanel = () => {
  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Top Wallets" icon={Eye} count={100} />
      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-1 pb-2">
          {mockActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-2 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors animate-slide-up"
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] font-mono text-muted-foreground">
                  {activity.wallet}
                </span>
                <span
                  className={`text-[10px] font-display font-semibold uppercase px-1.5 py-0.5 rounded ${
                    activity.action === "buy"
                      ? "text-up bg-[hsl(var(--chart-up))]/10"
                      : "text-down bg-[hsl(var(--chart-down))]/10"
                  }`}
                >
                  {activity.action}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="font-mono font-semibold text-foreground">${activity.token}</span>
                <span className="font-mono text-muted-foreground">{activity.amount}</span>
                <span className="font-mono text-muted-foreground text-[10px]">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
