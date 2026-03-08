import { BarChart3, DollarSign, Target, Zap } from "lucide-react";

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

const StatItem = ({ icon, label, value, sub }: StatItemProps) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border">
    <div className="text-primary">{icon}</div>
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-display font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

export const StatsBar = () => {
  return (
    <div className="grid grid-cols-4 gap-3 px-6 py-4">
      <StatItem
        icon={<Target className="h-4 w-4" />}
        label="Tokens Tracked"
        value="247"
        sub="Base Chain"
      />
      <StatItem
        icon={<Zap className="h-4 w-4" />}
        label="Signals Today"
        value="18"
        sub="5 high confidence"
      />
      <StatItem
        icon={<BarChart3 className="h-4 w-4" />}
        label="Top Wallet Hits"
        value="34"
        sub="Last 24h"
      />
      <StatItem
        icon={<DollarSign className="h-4 w-4" />}
        label="Bot Status"
        value="Monitoring"
        sub="Auto-trade: OFF"
      />
    </div>
  );
};
