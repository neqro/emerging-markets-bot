import { useState } from "react";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/hooks/useLanguage";

export const ChangePassword = () => {
  const { t } = useLanguage();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState("");

  const verifyMfaAndUpdate = async () => {
    if (!totpCode || totpCode.length !== 6) {
      toast.error("6 haneli TOTP kodu girin");
      return;
    }
    setLoading(true);
    try {
      // Get challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;

      // Verify TOTP
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: totpCode,
      });
      if (verifyError) {
        toast.error("TOTP kodu geçersiz");
        setLoading(false);
        return;
      }

      // Now AAL2, update password
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;

      toast.success(t("security.passwordChanged"));
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setTotpCode("");
      setNeedsMfa(false);
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async () => {
    if (newPw.length < 6) { toast.error(t("security.passwordNewMin")); return; }
    if (newPw !== confirmPw) { toast.error(t("security.passwordMismatch")); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User not found");

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
      if (signInError) { toast.error(t("security.passwordWrong")); setLoading(false); return; }

      // Try updating password directly
      const { error } = await supabase.auth.updateUser({ password: newPw });
      
      if (error) {
        // Check if MFA/AAL2 is required
        if (error.message?.includes('AAL2') || error.code === 'insufficient_aal') {
          // Get MFA factors
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const verifiedFactor = factors?.totp?.find(f => f.status === 'verified');
          
          if (verifiedFactor) {
            setMfaFactorId(verifiedFactor.id);
            setNeedsMfa(true);
            setLoading(false);
            return;
          }
        }
        throw error;
      }

      toast.success(t("security.passwordChanged"));
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        {t("security.changePassword")}
      </h2>
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        {!needsMfa ? (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("security.currentPassword")}</Label>
              <Input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="text-xs h-9 bg-secondary border-border" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("security.newPassword")}</Label>
              <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="text-xs h-9 bg-secondary border-border" placeholder={t("security.newPasswordMin")} minLength={6} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("security.newPasswordRepeat")}</Label>
              <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="text-xs h-9 bg-secondary border-border" placeholder="••••••••" />
            </div>
            <Button onClick={handleChange} disabled={loading || !currentPw || !newPw || !confirmPw} size="sm" className="w-full h-8 text-xs font-mono">
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {t("security.changePasswordBtn")}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">MFA Doğrulaması Gerekli</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Şifre değiştirmek için authenticator uygulamanızdaki 6 haneli kodu girin.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">TOTP Kodu</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === "Enter" && verifyMfaAndUpdate()}
                className="text-xs h-9 bg-secondary border-border font-mono tracking-widest text-center"
                placeholder="000000"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setNeedsMfa(false); setTotpCode(""); }} variant="outline" size="sm" className="flex-1 h-8 text-xs font-mono">
                İptal
              </Button>
              <Button onClick={verifyMfaAndUpdate} disabled={loading || totpCode.length !== 6} size="sm" className="flex-1 h-8 text-xs font-mono">
                {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Doğrula ve Değiştir
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
