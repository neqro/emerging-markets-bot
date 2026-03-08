
-- Auto trade settings per user
CREATE TABLE public.auto_trade_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  max_sol_per_trade NUMERIC NOT NULL DEFAULT 0.1,
  max_daily_sol NUMERIC NOT NULL DEFAULT 1.0,
  daily_sol_used NUMERIC NOT NULL DEFAULT 0,
  daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  min_confidence_buy INTEGER NOT NULL DEFAULT 60,
  min_confidence_sell INTEGER NOT NULL DEFAULT 50,
  stop_loss_percent NUMERIC NOT NULL DEFAULT 20,
  take_profit_percent NUMERIC NOT NULL DEFAULT 50,
  max_open_positions INTEGER NOT NULL DEFAULT 5,
  auto_buy_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_sell_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_trade_settings ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own settings
CREATE POLICY "Users can view own auto trade settings"
  ON public.auto_trade_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own auto trade settings"
  ON public.auto_trade_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own auto trade settings"
  ON public.auto_trade_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role full access for auto-trade execution
CREATE POLICY "Service role manages auto trade settings"
  ON public.auto_trade_settings FOR ALL
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_auto_trade_settings_updated_at
  BEFORE UPDATE ON public.auto_trade_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_trade_settings;
