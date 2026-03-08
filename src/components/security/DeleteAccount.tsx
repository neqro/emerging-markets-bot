import { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";

export const DeleteAccount = () => {
  const { user } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"idle" | "confirm" | "password">("idle");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user?.email || !password) return;
    setLoading(true);
    try {
      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInError) {
        toast.error("Şifre yanlış");
        setLoading(false);
        return;
      }

      // Call edge function to delete account
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/wallet-manager`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "delete-account" }),
      });
      const data = await res.json();

      if (data.success) {
        await supabase.auth.signOut();
        toast.success("Hesabınız silindi.");
      } else {
        toast.error(data.error || "Hesap silinemedi");
      }
    } catch (e: any) {
      toast.error(e.message || "Hesap silinemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-destructive" />
        Hesap Silme
      </h2>

      {step === "idle" && (
        <div className="rounded-lg bg-card border border-border p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Hesabınızı silmek tüm verilerinizi, cüzdanınızı ve işlem geçmişinizi kalıcı olarak kaldırır.
          </p>
          <Button
            onClick={() => setStep("confirm")}
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Hesabımı Sil
          </Button>
        </div>
      )}

      {step === "confirm" && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-bold text-destructive">Bu işlem geri alınamaz!</span>
          </div>
          <p className="text-[10px] text-destructive/80">
            Onaylamak için aşağıya <span className="font-bold">SİL</span> yazın:
          </p>
          <Input
            placeholder='SİL yazın...'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="text-xs h-8 bg-secondary border-destructive/30 font-mono uppercase"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setStep("password")}
              disabled={confirmText !== "SİL"}
              variant="destructive"
              size="sm"
              className="h-7 text-[10px]"
            >
              Devam Et
            </Button>
            <Button
              onClick={() => { setStep("idle"); setConfirmText(""); }}
              variant="ghost"
              size="sm"
              className="h-7 text-[10px]"
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {step === "password" && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 space-y-3">
          <p className="text-xs text-destructive">Son adım: Hesap şifrenizi girin.</p>
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground">Hesap Şifresi</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-xs h-8 bg-secondary border-destructive/30"
              placeholder="••••••••"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDelete}
              disabled={loading || !password}
              variant="destructive"
              size="sm"
              className="h-7 text-[10px]"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Hesabı Kalıcı Olarak Sil
            </Button>
            <Button
              onClick={() => { setStep("idle"); setPassword(""); setConfirmText(""); }}
              variant="ghost"
              size="sm"
              className="h-7 text-[10px]"
            >
              İptal
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
