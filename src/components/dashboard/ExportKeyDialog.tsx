import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Copy, Check, AlertTriangle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/components/ui/sonner";

interface ExportKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "warning" | "password" | "confirm" | "reveal";

export const ExportKeyDialog = ({ open, onOpenChange }: ExportKeyDialogProps) => {
  const { exportPrivateKey } = useWallet();
  const [step, setStep] = useState<Step>("warning");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setStep("warning");
    setPassword("");
    setConfirmText("");
    setPrivateKey("");
    setShowKey(false);
    setCopied(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handlePasswordVerify = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const result = await exportPrivateKey(password);
      if (result?.success) {
        setPrivateKey(result.privateKey);
        setStep("confirm");
      } else {
        toast.error(result?.error || "Şifre doğrulanamadı");
      }
    } catch {
      toast.error("Doğrulama hatası");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (confirmText.toUpperCase() !== "EXPORT") {
      toast.error("Lütfen EXPORT yazın");
      return;
    }
    setStep("reveal");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(privateKey);
    setCopied(true);
    toast.success("Private key kopyalandı!");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-display">
            <Shield className="h-5 w-5 text-destructive" />
            Private Key Dışa Aktar
          </DialogTitle>
        </DialogHeader>

        {step === "warning" && (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-bold text-destructive">Güvenlik Uyarısı</span>
              </div>
              <ul className="text-[11px] text-destructive/80 space-y-1 list-disc list-inside">
                <li>Private key'inizi asla kimseyle paylaşmayın</li>
                <li>Bu bilgiyi gören herkes cüzdanınıza erişebilir</li>
                <li>Güvenli bir ortamda olduğunuzdan emin olun</li>
                <li>Ekran paylaşımı veya kayıt yapılmadığından emin olun</li>
              </ul>
            </div>
            <Button
              onClick={() => setStep("password")}
              variant="destructive"
              className="w-full h-9 text-xs font-mono"
            >
              Anlıyorum, Devam Et
            </Button>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Kimliğinizi doğrulamak için hesap şifrenizi girin.
            </p>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Hesap Şifresi</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordVerify()}
                className="text-xs h-9 bg-secondary border-border"
              />
            </div>
            <Button
              onClick={handlePasswordVerify}
              disabled={loading || !password}
              className="w-full h-9 text-xs font-mono"
            >
              {loading ? "Doğrulanıyor..." : "Şifreyi Doğrula"}
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Son güvenlik adımı: Onaylamak için aşağıya <span className="text-primary font-bold">EXPORT</span> yazın.
            </p>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Onay Kodu</Label>
              <Input
                placeholder='EXPORT yazın...'
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                className="text-xs h-9 bg-secondary border-border font-mono uppercase tracking-widest"
              />
            </div>
            <Button
              onClick={handleConfirm}
              variant="destructive"
              disabled={confirmText.toUpperCase() !== "EXPORT"}
              className="w-full h-9 text-xs font-mono"
            >
              Private Key'i Göster
            </Button>
          </div>
        )}

        {step === "reveal" && (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Private Key</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowKey(!showKey)} className="text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground">
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] font-mono break-all leading-relaxed text-foreground">
                {showKey ? privateKey : "•".repeat(64)}
              </p>
            </div>
            <p className="text-[9px] text-destructive text-center">
              ⚠️ Bu pencereyi kapattıktan sonra key tekrar gösterilmeyecek
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
