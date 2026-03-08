-- Takip edilen cüzdanlar tablosu
CREATE TABLE public.tracked_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  label TEXT,
  is_whale BOOLEAN DEFAULT false,
  total_profit_usd DECIMAL(20, 2) DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cüzdan işlemleri tablosu
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES public.tracked_wallets(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  amount_sol DECIMAL(20, 8),
  amount_usd DECIMAL(20, 2),
  price_at_trade DECIMAL(30, 18),
  signature TEXT UNIQUE,
  block_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bot sinyalleri tablosu
CREATE TABLE public.bot_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'watch')),
  confidence_score DECIMAL(5, 2),
  reason TEXT,
  whale_wallets_buying INTEGER DEFAULT 0,
  bot_activity_score DECIMAL(5, 2) DEFAULT 0,
  liquidity_usd DECIMAL(20, 2),
  volume_24h DECIMAL(20, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Token analiz geçmişi
CREATE TABLE public.token_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  holder_count INTEGER,
  top_10_holder_percentage DECIMAL(5, 2),
  bot_transaction_percentage DECIMAL(5, 2),
  is_honeypot BOOLEAN DEFAULT false,
  risk_score DECIMAL(5, 2),
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX idx_wallet_transactions_token ON public.wallet_transactions(token_address);
CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_bot_signals_token ON public.bot_signals(token_address);
CREATE INDEX idx_bot_signals_active ON public.bot_signals(is_active);
CREATE INDEX idx_token_analysis_token ON public.token_analysis(token_address);

-- RLS etkinleştir
ALTER TABLE public.tracked_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_analysis ENABLE ROW LEVEL SECURITY;

-- Public okuma politikaları
CREATE POLICY "Herkes takip edilen cuzdanlari gorebilir" ON public.tracked_wallets FOR SELECT USING (true);
CREATE POLICY "Herkes islemleri gorebilir" ON public.wallet_transactions FOR SELECT USING (true);
CREATE POLICY "Herkes sinyalleri gorebilir" ON public.bot_signals FOR SELECT USING (true);
CREATE POLICY "Herkes analizleri gorebilir" ON public.token_analysis FOR SELECT USING (true);

-- Service role ile yazma
CREATE POLICY "Service role cuzdan ekleyebilir" ON public.tracked_wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role cuzdan guncelleyebilir" ON public.tracked_wallets FOR UPDATE USING (true);
CREATE POLICY "Service role islem ekleyebilir" ON public.wallet_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role sinyal ekleyebilir" ON public.bot_signals FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role sinyal guncelleyebilir" ON public.bot_signals FOR UPDATE USING (true);
CREATE POLICY "Service role analiz ekleyebilir" ON public.token_analysis FOR INSERT WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tracked_wallets_updated_at
  BEFORE UPDATE ON public.tracked_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_signals_updated_at
  BEFORE UPDATE ON public.bot_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();