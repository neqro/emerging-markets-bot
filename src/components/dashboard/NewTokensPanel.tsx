import { Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getNewTokenPairs } from "@/lib/dexscreener";
import { TokenCard } from "./TokenCard";
import { PanelHeader } from "./PanelHeader";
import { ScrollArea } from "@/components/ui/scroll-area";

export const NewTokensPanel = () => {
  const { data: pairs, isLoading } = useQuery({
    queryKey: ["new-tokens"],
    queryFn: getNewTokenPairs,
    refetchInterval: 30000,
  });

  return (
    <div className="flex flex-col h-full">
      <PanelHeader title="New Tokens" icon={Sparkles} count={pairs?.length} accent="primary" />
      <ScrollArea className="flex-1 -mx-1 px-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : pairs && pairs.length > 0 ? (
          <div className="space-y-2 pb-2">
            {pairs.map((pair) => (
              <TokenCard key={pair.pairAddress} pair={pair} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8">
            No new Base tokens found
          </p>
        )}
      </ScrollArea>
    </div>
  );
};
