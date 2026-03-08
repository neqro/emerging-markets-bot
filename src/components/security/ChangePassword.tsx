import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (newPw.length < 6) { toast.error(t("security.passwordNewMin")); return; }
    if (newPw !== confirmPw) { toast.error(t("security.passwordMismatch")); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("User not found");

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
      if (signInError) { toast.error(t("security.passwordWrong")); return; }

      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;

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
      </div>
    </section>
  );
};
