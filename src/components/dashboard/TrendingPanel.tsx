import { Flame, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getTrendingTokens } from "@/lib/dexscreener";
import { TokenCard } from "./TokenCard";
import { PanelHeader } from "./PanelHeader";
import { ScrollArea } from "@/components/ui/scroll-area";

export const TrendingPanel = () => {
  const { data: pairs, isLoading } = useQuery({
    queryKey: ["trending-tokens"],
    queryFn: getTrendingTokens,
    refetchInterval: 30000,
  });

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="Trending" icon={Flame} count={pairs?.length} accent="accent" />
      <ScrollArea className="flex-1 -mx-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : pairs && pairs.length > 0 ? (
          <div className="space-y-2 pb-2">
            {pairs.map((pair) => (
              <TokenCard key={pair.pairAddress} pair={pair} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">
            No trending Base tokens
          </p>
        )}
      </ScrollArea>
    </div>
  );
};
