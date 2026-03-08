import { useState } from "react";
import { Wallet as WalletIcon, Copy, Check, Plus, ArrowDownToLine, ArrowUpFromLine, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "./PanelHeader";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { TradeDialog } from "./TradeDialog";
import { AutoTradeSettings } from "./AutoTradeSettings";
import { WithdrawDialog } from "./WithdrawDialog";
import { toast } from "@/components/ui/sonner";

export const WalletPanel = () => {
  const { wallet, trades, loading, createWallet } = useWallet();
  const { signOut, user } = useAuth();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeToken, setTradeToken] = useState<{ address: string; symbol: string } | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const handleCopy = () => {
    if (wallet?.publicKey) {
      navigator.clipboard.writeText(wallet.publicKey);
      setCopied(true);
      toast.success(t("wallet.copied"));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = async () => {
    const result = await createWallet();
    if (result?.success) {
      toast.success(t("wallet.created"));
    } else {
      toast.error(result?.error || "Failed");
    }
  };

  const openQuickTrade = (address?: string, symbol?: string) => {
    setTradeToken(address ? { address, symbol: symbol || '' } : null);
    setTradeOpen(true);
  };

  return (
    <>
      <PanelHeader
        icon={WalletIcon}
        title={t("wallet.title")}
        badge={wallet ? `${wallet.balance.toFixed(4)} SOL` : undefined}
      />

      <div className="flex-1 overflow-y-auto space-y-3 mt-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse-glow text-primary text-xs font-mono">{t("wallet.loading")}</div>
          </div>
        ) : !wallet ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center glow-primary">
              <WalletIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground text-center whitespace-pre-line">{t("wallet.createDesc")}</p>
            <Button onClick={handleCreate} size="sm" className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t("wallet.create")}
            </Button>
          </div>
        ) : (
          <>
            <AutoTradeSettings />

            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("wallet.balance")}</div>
              <div className="text-xl font-display font-bold text-foreground">
                {wallet.balance.toFixed(4)} <span className="text-sm text-muted-foreground">SOL</span>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3" />
                  {t("wallet.deposit")}
                </div>
                <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="text-[10px] font-mono text-foreground break-all leading-relaxed">{wallet.publicKey}</p>
              <p className="text-[9px] text-muted-foreground mt-1">{t("wallet.depositDesc")}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => openQuickTrade()} className="h-8 text-xs font-mono">
                {t("wallet.quickTrade")}
              </Button>
              <Button onClick={() => setWithdrawOpen(true)} variant="outline" className="h-8 text-xs font-mono">
                <ArrowUpFromLine className="h-3.5 w-3.5 mr-1" />
                {t("wallet.withdraw")}
              </Button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <History className="h-3 w-3" />
                {t("wallet.recentTrades")}
              </div>
              {trades.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">{t("wallet.noTrades")}</p>
              ) : (
                trades.slice(0, 5).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-2 py-1.5 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className={
                        trade.order_type === 'buy' ? 'text-[hsl(var(--chart-up))]' :
                        trade.order_type === 'withdraw' ? 'text-accent' :
                        'text-[hsl(var(--chart-down))]'
                      }>
                        {trade.order_type === 'buy' ? '↑ BUY' : trade.order_type === 'withdraw' ? '↗ WD' : '↓ SELL'}
                      </span>
                      <span className="text-foreground font-mono">{trade.token_symbol || trade.token_address.slice(0, 6)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{trade.amount_sol} SOL</span>
                      <span className={
                        trade.status === 'completed' ? 'text-primary' :
                        trade.status === 'failed' ? 'text-destructive' :
                        'text-accent'
                      }>
                        {trade.status === 'completed' ? '✓' : trade.status === 'failed' ? '✗' : '⏳'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {user && (
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground truncate max-w-[150px]">{user.email}</span>
              <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors">
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      <TradeDialog open={tradeOpen} onOpenChange={setTradeOpen} preselectedToken={tradeToken} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </>
  );
};
