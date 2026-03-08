import { useState } from "react";
import { Wallet as WalletIcon, Copy, Check, Plus, ArrowDownToLine, ArrowUpFromLine, History, LogOut, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "./PanelHeader";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { TradeDialog } from "./TradeDialog";
import { AutoTradeSettings } from "./AutoTradeSettings";
import { WithdrawDialog } from "./WithdrawDialog";
import { ExportKeyDialog } from "./ExportKeyDialog";
import { toast } from "@/components/ui/sonner";

export const WalletPanel = () => {
  const { wallet, trades, loading, createWallet } = useWallet();
  const { signOut, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeToken, setTradeToken] = useState<{ address: string; symbol: string } | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [exportKeyOpen, setExportKeyOpen] = useState(false);

  const handleCopy = () => {
    if (wallet?.publicKey) {
      navigator.clipboard.writeText(wallet.publicKey);
      setCopied(true);
      toast.success("Adres kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = async () => {
    const result = await createWallet();
    if (result?.success) {
      toast.success("Cüzdan oluşturuldu! SOL yatırarak trade'e başla.");
    } else {
      toast.error(result?.error || "Cüzdan oluşturulamadı");
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
        title="Cüzdan"
        badge={wallet ? `${wallet.balance.toFixed(4)} SOL` : undefined}
      />

      <div className="flex-1 overflow-y-auto space-y-3 mt-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse-glow text-primary text-xs font-mono">Yükleniyor...</div>
          </div>
        ) : !wallet ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center glow-primary">
              <WalletIcon className="h-6 w-6 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Dahili cüzdan oluştur ve<br />SOL yatırarak trade'e başla
            </p>
            <Button onClick={handleCreate} size="sm" className="text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Cüzdan Oluştur
            </Button>
          </div>
        ) : (
          <>
            <AutoTradeSettings />

            {/* Balance Card */}
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bakiye</div>
              <div className="text-xl font-display font-bold text-foreground">
                {wallet.balance.toFixed(4)} <span className="text-sm text-muted-foreground">SOL</span>
              </div>
            </div>

            {/* Deposit Address */}
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3" />
                  Deposit Adresi
                </div>
                <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="text-[10px] font-mono text-foreground break-all leading-relaxed">
                {wallet.publicKey}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1">
                Bu adrese SOL göndererek bakiye yükle
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => openQuickTrade()} className="h-8 text-xs font-mono">
                ⚡ Hızlı Trade
              </Button>
              <Button onClick={() => setWithdrawOpen(true)} variant="outline" className="h-8 text-xs font-mono">
                <ArrowUpFromLine className="h-3.5 w-3.5 mr-1" />
                SOL Çek
              </Button>
            </div>

            {/* Security: Export Key */}
            <button
              onClick={() => setExportKeyOpen(true)}
              className="w-full flex items-center gap-2 rounded-lg bg-secondary/30 border border-border p-2.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
            >
              <Key className="h-3.5 w-3.5" />
              <span>Private Key Dışa Aktar</span>
            </button>

            {/* Recent Trades */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <History className="h-3 w-3" />
                Son İşlemler
              </div>
              {trades.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-2">Henüz işlem yok</p>
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

        {/* User info & logout */}
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
      <ExportKeyDialog open={exportKeyOpen} onOpenChange={setExportKeyOpen} />
    </>
  );
};
