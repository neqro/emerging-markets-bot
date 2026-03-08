
-- User wallets table (internal Solana wallets)
CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  sol_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trade orders table
CREATE TABLE public.trade_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id UUID REFERENCES public.user_wallets(id) NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  order_type TEXT NOT NULL, -- 'buy' or 'sell'
  amount_sol NUMERIC NOT NULL,
  amount_tokens NUMERIC,
  price_at_trade NUMERIC,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, executing, completed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_orders ENABLE ROW LEVEL SECURITY;

-- User wallets: users can only see their own wallet
CREATE POLICY "Users can view own wallet" ON public.user_wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Trade orders: users can only see their own orders
CREATE POLICY "Users can view own orders" ON public.trade_orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Service role can insert/update wallets and orders
CREATE POLICY "Service role manages wallets" ON public.user_wallets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages orders" ON public.trade_orders
  FOR ALL USING (true) WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trade_orders_updated_at
  BEFORE UPDATE ON public.trade_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime for trade orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_wallets;
