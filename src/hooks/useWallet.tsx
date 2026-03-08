import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Wallet {
  id?: string;
  publicKey: string;
  balance: number;
  createdAt?: string;
}

interface TradeOrder {
  id: string;
  token_address: string;
  token_symbol: string | null;
  order_type: string;
  amount_sol: number;
  status: string;
  tx_signature: string | null;
  created_at: string;
}

export const useWallet = () => {
  const { user, session } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [tradeLoading, setTradeLoading] = useState(false);

  const callWalletManager = useCallback(async (action: string, extra: any = {}) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/wallet-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json();
  }, [session]);

  const fetchWallet = useCallback(async () => {
    if (!user || !session) return;
    setLoading(true);
    try {
      const data = await callWalletManager('get-wallet');
      if (data.success && data.wallet) {
        setWallet(data.wallet);
      } else {
        setWallet(null);
      }
    } catch (e) {
      console.error('Fetch wallet error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, session, callWalletManager]);

  const createWallet = useCallback(async () => {
    if (!user || !session) return;
    setLoading(true);
    try {
      const data = await callWalletManager('create-wallet');
      if (data.success && data.wallet) {
        setWallet(data.wallet);
      }
      return data;
    } catch (e) {
      console.error('Create wallet error:', e);
      return { error: String(e) };
    } finally {
      setLoading(false);
    }
  }, [user, session, callWalletManager]);

  const executeTrade = useCallback(async (tokenAddress: string, tokenSymbol: string | null, orderType: 'buy' | 'sell', amountSol: number) => {
    setTradeLoading(true);
    try {
      const data = await callWalletManager('execute-trade', {
        tokenAddress, tokenSymbol, orderType, amountSol,
      });
      if (data.success) {
        await fetchWallet();
        await fetchTrades();
      }
      return data;
    } catch (e) {
      return { error: String(e) };
    } finally {
      setTradeLoading(false);
    }
  }, [callWalletManager, fetchWallet]);

  const withdraw = useCallback(async (destinationAddress: string, amountSol: number) => {
    setTradeLoading(true);
    try {
      const data = await callWalletManager('withdraw', { destinationAddress, amountSol });
      if (data.success) {
        await fetchWallet();
        await fetchTrades();
      }
      return data;
    } catch (e) {
      return { error: String(e) };
    } finally {
      setTradeLoading(false);
    }
  }, [callWalletManager, fetchWallet]);

  const exportPrivateKey = useCallback(async (password: string) => {
    try {
      const data = await callWalletManager('export-key', { password });
      return data;
    } catch (e) {
      return { error: String(e) };
    }
  }, [callWalletManager]);

  const fetchTrades = useCallback(async () => {
    if (!user || !session) return;
    try {
      const data = await callWalletManager('get-trades');
      if (data.success) {
        setTrades(data.trades || []);
      }
    } catch (e) {
      console.error('Fetch trades error:', e);
    }
  }, [user, session, callWalletManager]);

  useEffect(() => {
    if (user && session) {
      fetchWallet();
      fetchTrades();
    }
  }, [user, session, fetchWallet, fetchTrades]);

  // Realtime subscription for trade updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('trade-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trade_orders',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchTrades();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTrades]);

  return {
    wallet, trades, loading, tradeLoading,
    createWallet, fetchWallet, executeTrade, fetchTrades,
    withdraw, exportPrivateKey,
  };
};
