import { BarChart3, DollarSign, Target, Zap, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const queryClient = useQueryClient();

  const { data: analysisCount } = useQuery({
    queryKey: ["analysis-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("token_analysis")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: signalCount } = useQuery({
    queryKey: ["signal-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bot_signals")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return count || 0;
    },
    refetchInterval: 15000,
  });

  const { data: walletCount } = useQuery({
    queryKey: ["wallet-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("tracked_wallets")
        .select("*", { count: "exact", head: true })
        .eq("is_whale", true);
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("analyze-wallets", {
        body: { action: "auto-scan" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-signals"] });
      queryClient.invalidateQueries({ queryKey: ["analysis-count"] });
      queryClient.invalidateQueries({ queryKey: ["signal-count"] });
    },
  });

  return (
    <div className="grid grid-cols-5 gap-3 px-6 py-4">
      <StatItem
        icon={<Target className="h-4 w-4" />}
        label="Tokens Analyzed"
        value={String(analysisCount ?? 0)}
        sub="Solana Chain"
      />
      <StatItem
        icon={<Zap className="h-4 w-4" />}
        label="Active Signals"
        value={String(signalCount ?? 0)}
        sub="Buy / Sell / Watch"
      />
      <StatItem
        icon={<BarChart3 className="h-4 w-4" />}
        label="Whale Wallets"
        value={String(walletCount ?? 0)}
        sub="Tracked"
      />
      <StatItem
        icon={<DollarSign className="h-4 w-4" />}
        label="Bot Status"
        value="Monitoring"
        sub="Auto-trade: OFF"
      />
      <button
        onClick={() => scanMutation.mutate()}
        disabled={scanMutation.isPending}
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 text-primary ${scanMutation.isPending ? "animate-spin" : ""}`} />
        <div className="text-left">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Scan Now</p>
          <p className="text-sm font-display font-bold text-primary">
            {scanMutation.isPending ? "Scanning..." : "Auto Scan"}
          </p>
        </div>
      </button>
    </div>
  );
};