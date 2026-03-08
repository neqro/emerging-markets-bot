import { Eye, Wallet, Loader2, Star } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { PanelHeader } from "./PanelHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/dexscreener";
import { useFavorites } from "@/hooks/useFavorites";

export const WalletTrackerPanel = () => {
  const queryClient = useQueryClient();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ["tracked-wallets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracked_wallets")
        .select("*")
        .order("total_profit_usd", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*, tracked_wallets(address, label)")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("wallet-tracker-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tracked_wallets" }, () => {
        queryClient.invalidateQueries({ queryKey: ["tracked-wallets"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const isLoading = walletsLoading || txLoading;

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Top Wallets" icon={Eye} count={wallets?.length} />
      <ScrollArea className="flex-1 -mx-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="space-y-1 pb-2">
            {transactions.map((tx) => {
              const walletAddr = (tx.tracked_wallets as any)?.address || "";
              const walletLabel = (tx.tracked_wallets as any)?.label;
              const shortWallet = walletLabel || `${walletAddr.slice(0, 4)}...${walletAddr.slice(-4)}`;
              const isFav = walletAddr ? isFavorite("wallet", walletAddr) : false;

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors animate-slide-up"
                >
                  <div className="flex items-center gap-2">
                    {walletAddr && (
                      <button
                        onClick={() => toggleFavorite("wallet", walletAddr, walletLabel || shortWallet)}
                        className={`transition-colors ${isFav ? "text-primary" : "text-muted-foreground/30 hover:text-primary/60"}`}
                      >
                        <Star className={`h-3 w-3 ${isFav ? "fill-primary" : ""}`} />
                      </button>
                    )}
                    <Wallet className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[11px] font-mono text-muted-foreground">{shortWallet}</span>
                    <span
                      className={`text-[10px] font-display font-semibold uppercase px-1.5 py-0.5 rounded ${
                        tx.transaction_type === "buy"
                          ? "text-up bg-[hsl(var(--chart-up))]/10"
                          : "text-down bg-[hsl(var(--chart-down))]/10"
                      }`}
                    >
                      {tx.transaction_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="font-mono font-semibold text-foreground">
                      {tx.token_symbol || tx.token_address.slice(0, 6)}
                    </span>
                    {tx.amount_usd && (
                      <span className="font-mono text-muted-foreground">
                        ${Number(tx.amount_usd).toLocaleString()}
                      </span>
                    )}
                    <span className="font-mono text-muted-foreground text-[10px]">
                      {tx.block_time ? timeAgo(new Date(tx.block_time).getTime()) : timeAgo(new Date(tx.created_at).getTime())}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">Takip edilen cüzdan yok</p>
            <p className="text-[10px] text-muted-foreground mt-1">Whale cüzdanları eklendiğinde burada görünecek</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
