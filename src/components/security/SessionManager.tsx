import { useState } from "react";
import { Monitor, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";

export const SessionManager = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOutAll = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast.success("Tüm oturumlar kapatıldı. Tekrar giriş yapmanız gerekiyor.");
    } catch (e: any) {
      toast.error(e.message || "Oturumlar kapatılamadı");
    } finally {
      setLoading(false);
    }
  };

  const expiresAt = session?.expires_at
    ? new Date(session.expires_at * 1000).toLocaleString("tr-TR")
    : "Bilinmiyor";

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <Monitor className="h-4 w-4 text-primary" />
        Aktif Oturumlar
      </h2>
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        {/* Current Session */}
        <div className="rounded-md bg-secondary/50 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-foreground">Bu Cihaz (Aktif)</span>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Email: {user?.email}</p>
            <p>Oturum sona eriyor: {expiresAt}</p>
            <p>Son giriş: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("tr-TR") : "Bilinmiyor"}</p>
          </div>
        </div>

        <Button
          onClick={handleSignOutAll}
          disabled={loading}
          variant="destructive"
          size="sm"
          className="w-full h-8 text-xs font-mono"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogOut className="h-3 w-3 mr-1" />}
          Tüm Cihazlardan Çıkış Yap
        </Button>
      </div>
    </section>
  );
};
