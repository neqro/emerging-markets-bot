import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Bot, Mail, Lock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

const Auth = () => {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background terminal-grid">
        <div className="animate-pulse-glow text-primary text-lg font-mono">Loading...</div>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message === "Invalid login credentials" 
            ? "Email veya şifre hatalı" 
            : error.message);
        }
      } else {
        if (password.length < 6) {
          toast.error("Şifre en az 6 karakter olmalı");
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Kayıt başarılı! Email adresinizi doğrulayın.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background terminal-grid">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-primary/10 glow-primary mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">SolBot</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            Autonomous Trading Terminal
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl bg-card border border-border p-6">
          <h2 className="text-sm font-display font-semibold text-foreground mb-4">
            {isLogin ? "Giriş Yap" : "Hesap Oluştur"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-9 text-xs bg-secondary border-border"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-9 text-xs bg-secondary border-border"
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-9 text-xs font-mono"
            >
              {submitting ? "..." : isLogin ? "Giriş Yap" : "Kayıt Ol"}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </form>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
          >
            {isLogin ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Dahili cüzdan ile güvenli trade. Harici cüzdan bağlantısı gerekmez.
        </p>
      </div>
    </div>
  );
};

export default Auth;
