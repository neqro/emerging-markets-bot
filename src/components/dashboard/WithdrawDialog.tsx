import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUpFromLine, AlertTriangle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/sonner";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WithdrawDialog = ({ open, onOpenChange }: WithdrawDialogProps) => {
  const { wallet, withdraw, loading } = useWallet();
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");

  const handleWithdraw = async () => {
    if (!address || !amount) {
      toast.error("Adres ve miktar gerekli");
      return;
    }
    const sol = parseFloat(amount);
    if (isNaN(sol) || sol <= 0) {
      toast.error("Geçersiz miktar");
      return;
    }
    if (wallet && sol > wallet.balance) {
      toast.error("Yetersiz bakiye");
      return;
    }
    const result = await withdraw(address, sol);
    if (result?.success) {
      toast.success(result.message || "Çekim başlatıldı!");
      setAddress("");
      setAmount("");
      onOpenChange(false);
    } else {
      toast.error(result?.error || "Çekim başarısız");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-display">
            <ArrowUpFromLine className="h-5 w-5 text-primary" />
            SOL Çek
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-[10px] text-destructive">
              Lütfen Solana ağında geçerli bir adres girin. Yanlış adrese gönderim geri alınamaz.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Hedef Adres</Label>
            <Input
              placeholder="Solana adresi girin..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="text-xs font-mono h-9 bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Miktar (SOL)</Label>
              {wallet && (
                <button
                  onClick={() => setAmount(String(Math.max(0, wallet.balance - 0.005)))}
                  className="text-[10px] text-primary hover:underline"
                >
                  Max: {wallet.balance.toFixed(4)} SOL
                </button>
              )}
            </div>
            <Input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-xs font-mono h-9 bg-secondary border-border"
            />
          </div>

          <Button
            onClick={handleWithdraw}
            disabled={loading || !address || !amount}
            className="w-full h-9 text-xs font-mono"
          >
            {loading ? "İşleniyor..." : "Çekimi Onayla"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
