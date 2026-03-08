import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Navigate } from "react-router-dom";
import { Bot, Mail, Lock, ArrowRight, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background terminal-grid">
        <div className="animate-pulse-glow text-primary text-lg font-mono">{t("common.loading")}</div>
      </div>
    );
  }

  if (user && !mfaRequired) return <Navigate to="/" replace />;

  const logLogin = async () => {
    try {
      await supabase.from("login_history").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        user_agent: navigator.userAgent,
        ip_address: null,
      });
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message === "Invalid login credentials" ? t("auth.invalidCreds") : error.message);
          setSubmitting(false);
          return;
        }

        const { data: { totp } } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = totp?.filter((f) => f.status === "verified") || [];

        if (verifiedFactors.length > 0) {
          setMfaRequired(true);
          setMfaFactorId(verifiedFactors[0].id);
        } else {
          await logLogin();
        }
      } else {
        if (password.length < 6) {
          toast.error(t("auth.passwordMin"));
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success(t("auth.emailVerify"));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setSubmitting(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      await logLogin();
      setMfaRequired(false);
      toast.success(t("mfa.verified"));
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background terminal-grid">
      <div className="w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 glow-primary mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">SolBot</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{t("auth.subtitle")}</p>
        </div>

        {mfaRequired ? (
          <div className="rounded-xl bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-display font-semibold text-foreground">{t("mfa.title")}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t("mfa.desc")}</p>
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-12 text-center text-xl font-mono tracking-[0.5em] bg-secondary border-border"
                maxLength={6}
                autoFocus
              />
              <Button onClick={handleMfaVerify} disabled={submitting || mfaCode.length !== 6} className="w-full h-9 text-xs font-mono">
                {submitting ? "..." : t("mfa.verify")}
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <button
                onClick={() => { setMfaRequired(false); setMfaCode(""); supabase.auth.signOut(); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("mfa.back")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl bg-card border border-border p-6">
              <h2 className="text-sm font-display font-semibold text-foreground mb-4">
                {isLogin ? t("auth.login") : t("auth.signup")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-9 text-xs bg-secondary border-border" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-9 text-xs bg-secondary border-border" required minLength={6} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-9 text-xs font-mono">
                  {submitting ? "..." : isLogin ? t("auth.login") : t("auth.signup")}
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </form>
              <button onClick={() => setIsLogin(!isLogin)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors">
                {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-4">{t("auth.tagline")}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
