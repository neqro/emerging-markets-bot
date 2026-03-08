import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Position {
  token_address: string;
  token_symbol: string | null;
  total_bought_sol: number;
  total_sold_sol: number;
  avg_buy_price: number | null;
  current_price: number | null;
  current_value_sol: number;
  pnl_sol: number;
  pnl_percent: number;
  status: "open" | "closed";
  last_trade_at: string;
  price_history: number[];
}

export const usePositions = () => {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPnl, setTotalPnl] = useState(0);

  const fetchPositions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get all completed trades for the user
      const { data: trades, error } = await supabase
        .from("trade_orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (error || !trades?.length) {
        setPositions([]);
        setLoading(false);
        return;
      }

      // Group trades by token
      const tokenMap: Record<string, typeof trades> = {};
      for (const t of trades) {
        if (!tokenMap[t.token_address]) tokenMap[t.token_address] = [];
        tokenMap[t.token_address].push(t);
      }

      // Fetch current prices from DexScreener
      const addresses = Object.keys(tokenMap);
      let priceMap: Record<string, number> = {};
      
      // Batch fetch (max 30 at a time)
      for (let i = 0; i < addresses.length; i += 30) {
        const batch = addresses.slice(i, i + 30).join(",");
        try {
          const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${batch}`);
          if (res.ok) {
            const pairs = await res.json();
            for (const p of (Array.isArray(pairs) ? pairs : [])) {
              if (p?.baseToken?.address && p?.priceUsd) {
                priceMap[p.baseToken.address] = parseFloat(p.priceUsd);
              }
            }
          }
        } catch {}
      }

      // Build positions
      const positionsList: Position[] = [];
      let pnlTotal = 0;

      for (const [addr, tokenTrades] of Object.entries(tokenMap)) {
        let totalBought = 0;
        let totalSold = 0;
        let weightedBuyPrice = 0;
        let buyCount = 0;
        const priceHistory: number[] = [];

        for (const t of tokenTrades) {
          if (t.order_type === "buy") {
            totalBought += t.amount_sol;
            if (t.price_at_trade) {
              weightedBuyPrice += t.price_at_trade * t.amount_sol;
              buyCount += t.amount_sol;
            }
            priceHistory.push(t.price_at_trade || 0);
          } else {
            totalSold += t.amount_sol;
            if (t.price_at_trade) priceHistory.push(t.price_at_trade);
          }
        }

        const netSol = totalBought - totalSold;
        if (netSol <= 0.0001) continue; // No open position

        const avgBuyPrice = buyCount > 0 ? weightedBuyPrice / buyCount : null;
        const currentPrice = priceMap[addr] || null;
        
        // Estimate current value (simplified: net SOL is the position)
        const currentValue = netSol;
        const pnlSol = totalSold - totalBought + currentValue;
        const pnlPercent = totalBought > 0 ? (pnlSol / totalBought) * 100 : 0;

        if (currentPrice) priceHistory.push(currentPrice);

        positionsList.push({
          token_address: addr,
          token_symbol: tokenTrades[0].token_symbol,
          total_bought_sol: totalBought,
          total_sold_sol: totalSold,
          avg_buy_price: avgBuyPrice,
          current_price: currentPrice,
          current_value_sol: currentValue,
          pnl_sol: pnlSol,
          pnl_percent: pnlPercent,
          status: "open",
          last_trade_at: tokenTrades[tokenTrades.length - 1].created_at,
          price_history: priceHistory,
        });
        pnlTotal += pnlSol;
      }

      positionsList.sort((a, b) => Math.abs(b.pnl_sol) - Math.abs(a.pnl_sol));
      setPositions(positionsList);
      setTotalPnl(pnlTotal);
    } catch (e) {
      console.error("Fetch positions error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPositions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // Realtime trade updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("positions-trades")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "trade_orders",
        filter: `user_id=eq.${user.id}`,
      }, () => fetchPositions())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPositions]);

  return { positions, loading, totalPnl, refetch: fetchPositions };
};
