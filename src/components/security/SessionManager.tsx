import { useState } from "react";
import { Monitor, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/hooks/useLanguage";

export const SessionManager = () => {
  const { user, session } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleSignOutAll = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast.success(t("security.signedOutAll"));
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const locale = language === "tr" ? "tr-TR" : "en-US";
  const expiresAt = session?.expires_at
    ? new Date(session.expires_at * 1000).toLocaleString(locale)
    : t("common.unknown");

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <Monitor className="h-4 w-4 text-primary" />
        {t("security.sessions")}
      </h2>
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        <div className="rounded-md bg-secondary/50 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-foreground">{t("security.thisDevice")}</span>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Email: {user?.email}</p>
            <p>{t("security.sessionExpires")} {expiresAt}</p>
            <p>{t("security.lastLogin")} {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString(locale) : t("common.unknown")}</p>
          </div>
        </div>
        <Button onClick={handleSignOutAll} disabled={loading} variant="destructive" size="sm" className="w-full h-8 text-xs font-mono">
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogOut className="h-3 w-3 mr-1" />}
          {t("security.signOutAll")}
        </Button>
      </div>
    </section>
  );
};
