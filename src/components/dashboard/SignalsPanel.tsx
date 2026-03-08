import { Radio, ArrowUpRight, ArrowDownRight, Minus, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { PanelHeader } from "./PanelHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/dexscreener";

const signalColors = {
  buy: "text-up bg-[hsl(var(--chart-up))]/10 border-[hsl(var(--chart-up))]/20",
  sell: "text-down bg-[hsl(var(--chart-down))]/10 border-[hsl(var(--chart-down))]/20",
  watch: "text-accent bg-accent/10 border-accent/20",
};

const SignalIcon = ({ type }: { type: string }) => {
  if (type === "buy") return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (type === "sell") return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
};

export const SignalsPanel = () => {
  const queryClient = useQueryClient();

  const { data: signals, isLoading } = useQuery({
    queryKey: ["bot-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_signals")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("signals-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "bot_signals",
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["bot-signals"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Bot Signals" icon={Radio} count={signals?.length} accent="accent" />
      <ScrollArea className="flex-1 -mx-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : signals && signals.length > 0 ? (
          <div className="space-y-2 pb-2">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className={`p-3 rounded-lg border animate-slide-up ${signalColors[signal.signal_type as keyof typeof signalColors] || signalColors.watch}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <SignalIcon type={signal.signal_type} />
                    <span className="text-xs font-display font-semibold uppercase">
                      {signal.signal_type}
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {signal.token_symbol || signal.token_address.slice(0, 6) + "..."}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {timeAgo(new Date(signal.created_at).getTime())}
                  </span>
                </div>
                <p className="text-[11px] text-secondary-foreground mb-1.5">{signal.reason}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    {signal.whale_wallets_buying > 0 && (
                      <span className="font-mono text-primary">🐋 {signal.whale_wallets_buying} whale</span>
                    )}
                    {signal.bot_activity_score > 0 && (
                      <span className="font-mono text-muted-foreground">🤖 Bot: {Number(signal.bot_activity_score).toFixed(0)}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-current transition-all"
                        style={{ width: `${signal.confidence_score || 0}%` }}
                      />
                    </div>
                    <span className="font-mono">{Number(signal.confidence_score || 0).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">Henüz sinyal yok</p>
            <p className="text-[10px] text-muted-foreground mt-1">Token analizi yapıldığında burada görünecek</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
