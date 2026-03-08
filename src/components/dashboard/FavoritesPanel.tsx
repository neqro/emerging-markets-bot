import { Star, Loader2, ExternalLink, Wallet } from "lucide-react";
import { PanelHeader } from "./PanelHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFavorites } from "@/hooks/useFavorites";
import { useLanguage } from "@/hooks/useLanguage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FavoritesPanel = () => {
  const { tokenFavorites, walletFavorites, loading, toggleFavorite } = useFavorites();
  const { t } = useLanguage();

  // Fetch tracked wallet details for wallet favorites
  const { data: walletDetails } = useQuery({
    queryKey: ["fav-wallets", walletFavorites.map((f) => f.item_id)],
    queryFn: async () => {
      if (walletFavorites.length === 0) return [];
      const ids = walletFavorites.map((f) => f.item_id);
      const { data } = await supabase
        .from("tracked_wallets")
        .select("*")
        .in("address", ids);
      return data || [];
    },
    enabled: walletFavorites.length > 0,
  });

  const total = tokenFavorites.length + walletFavorites.length;

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title={t("favorites.title")} icon={Star} count={total} />
      <ScrollArea className="flex-1 -mx-1 px-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : total === 0 ? (
          <div className="text-center py-8">
            <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">{t("favorites.empty")}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{t("favorites.emptyDesc")}</p>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {/* Token Favorites */}
            {tokenFavorites.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono px-1">
                  {t("favorites.tokens")} ({tokenFavorites.length})
                </div>
                {tokenFavorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center justify-between p-2 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                        {(fav.label || fav.item_id).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[11px] font-mono font-semibold text-foreground">{fav.label || fav.item_id.slice(0, 8)}</span>
                        <p className="text-[9px] text-muted-foreground font-mono">{fav.item_id.slice(0, 6)}...{fav.item_id.slice(-4)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://dexscreener.com/solana/${fav.item_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => toggleFavorite("token", fav.item_id)}
                        className="text-primary hover:text-primary/70"
                      >
                        <Star className="h-3.5 w-3.5 fill-primary" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Wallet Favorites */}
            {walletFavorites.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono px-1">
                  {t("favorites.wallets")} ({walletFavorites.length})
                </div>
                {walletFavorites.map((fav) => {
                  const detail = walletDetails?.find((w) => w.address === fav.item_id);
                  return (
                    <div
                      key={fav.id}
                      className="flex items-center justify-between p-2 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <span className="text-[11px] font-mono font-semibold text-foreground">
                            {fav.label || detail?.label || `${fav.item_id.slice(0, 4)}...${fav.item_id.slice(-4)}`}
                          </span>
                          {detail && (
                            <p className="text-[9px] text-muted-foreground font-mono">
                              {detail.win_rate ? `WR: ${Number(detail.win_rate).toFixed(0)}%` : ""} 
                              {detail.total_profit_usd ? ` · $${Number(detail.total_profit_usd).toLocaleString()}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavorite("wallet", fav.item_id)}
                        className="text-primary hover:text-primary/70"
                      >
                        <Star className="h-3.5 w-3.5 fill-primary" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
