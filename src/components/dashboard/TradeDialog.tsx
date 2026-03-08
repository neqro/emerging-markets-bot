import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/sonner";
import { ArrowUpDown, Zap } from "lucide-react";

interface TradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedToken?: { address: string; symbol: string } | null;
}

export const TradeDialog = ({ open, onOpenChange, preselectedToken }: TradeDialogProps) => {
  const { wallet, tradeLoading, executeTrade } = useWallet();
  const [tokenAddress, setTokenAddress] = useState(preselectedToken?.address || "");
  const [tokenSymbol, setTokenSymbol] = useState(preselectedToken?.symbol || "");
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [amountSol, setAmountSol] = useState("");

  // Sync preselected token when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && preselectedToken) {
      setTokenAddress(preselectedToken.address);
      setTokenSymbol(preselectedToken.symbol);
    }
    onOpenChange(isOpen);
  };

  const handleTrade = async () => {
    const amount = parseFloat(amountSol);
    if (!tokenAddress || !amount || amount <= 0) {
      toast.error("Token adresi ve miktar gerekli");
      return;
    }
    if (orderType === 'buy' && wallet && amount > wallet.balance) {
      toast.error(`Yetersiz bakiye. Mevcut: ${wallet.balance.toFixed(4)} SOL`);
      return;
    }

    const result = await executeTrade(tokenAddress, tokenSymbol || null, orderType, amount);
    if (result?.success) {
      toast.success(`${orderType === 'buy' ? 'Alım' : 'Satım'} başarılı! TX: ${result.order?.txSignature?.slice(0, 12)}...`);
      onOpenChange(false);
      setAmountSol("");
    } else {
      toast.error(result?.error || "Trade başarısız");
    }
  };

  const presets = [0.05, 0.1, 0.25, 0.5, 1];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-display flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Hızlı Trade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Order type toggle */}
          <div className="grid grid-cols-2 gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setOrderType('buy')}
              className={`text-xs py-1.5 rounded-md font-mono transition-colors ${
                orderType === 'buy'
                  ? 'bg-[hsl(var(--chart-up))] text-background font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ↑ BUY
            </button>
            <button
              onClick={() => setOrderType('sell')}
              className={`text-xs py-1.5 rounded-md font-mono transition-colors ${
                orderType === 'sell'
                  ? 'bg-[hsl(var(--chart-down))] text-background font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ↓ SELL
            </button>
          </div>

          {/* Token address */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Token Adresi</label>
            <Input
              placeholder="Token mint address..."
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="h-8 text-xs bg-secondary border-border font-mono mt-1"
            />
          </div>

          {/* Token symbol (optional) */}
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sembol (opsiyonel)</label>
            <Input
              placeholder="örn: BONK"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="h-8 text-xs bg-secondary border-border mt-1"
            />
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Miktar (SOL)</label>
              {wallet && (
                <span className="text-[10px] text-muted-foreground">
                  Bakiye: {wallet.balance.toFixed(4)} SOL
                </span>
              )}
            </div>
            <Input
              type="number"
              placeholder="0.1"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
              className="h-8 text-xs bg-secondary border-border font-mono mt-1"
              step="0.01"
              min="0.001"
            />
            <div className="flex gap-1 mt-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmountSol(String(p))}
                  className="flex-1 text-[9px] py-1 rounded bg-secondary hover:bg-border transition-colors text-muted-foreground hover:text-foreground font-mono"
                >
                  {p} SOL
                </button>
              ))}
            </div>
          </div>

          {/* Execute */}
          <Button
            onClick={handleTrade}
            disabled={tradeLoading || !tokenAddress || !amountSol}
            className={`w-full h-9 text-xs font-mono ${
              orderType === 'buy'
                ? 'bg-[hsl(var(--chart-up))] hover:bg-[hsl(var(--chart-up))]/80 text-background'
                : 'bg-[hsl(var(--chart-down))] hover:bg-[hsl(var(--chart-down))]/80 text-background'
            }`}
          >
            {tradeLoading ? (
              <span className="animate-pulse">İşlem yürütülüyor...</span>
            ) : (
              <>
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                {orderType === 'buy' ? `${amountSol || '0'} SOL ile AL` : `${amountSol || '0'} SOL değerinde SAT`}
              </>
            )}
          </Button>

          <p className="text-[9px] text-muted-foreground text-center">
            Jupiter Aggregator üzerinden swap • %3 slippage • Otomatik priority fee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
