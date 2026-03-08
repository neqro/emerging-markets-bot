import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AutoTradeSettings {
  id: string;
  is_enabled: boolean;
  max_sol_per_trade: number;
  max_daily_sol: number;
  daily_sol_used: number;
  min_confidence_buy: number;
  min_confidence_sell: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  max_open_positions: number;
  auto_buy_enabled: boolean;
  auto_sell_enabled: boolean;
}

export const useAutoTrade = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AutoTradeSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('auto_trade_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setSettings(data as AutoTradeSettings | null);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('auto_trade_settings')
      .insert({ user_id: user.id })
      .select()
      .single();
    setSettings(data as AutoTradeSettings);
    return data;
  }, [user]);

  const updateSettings = useCallback(async (updates: Partial<AutoTradeSettings>) => {
    if (!settings) return;
    const { data } = await supabase
      .from('auto_trade_settings')
      .update(updates)
      .eq('id', settings.id)
      .select()
      .single();
    setSettings(data as AutoTradeSettings);
    return data;
  }, [settings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('auto-trade-settings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'auto_trade_settings',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchSettings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchSettings]);

  return { settings, loading, createSettings, updateSettings, fetchSettings };
};
