import { useState, useEffect } from "react";
import { History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LoginEntry {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  logged_in_at: string;
}

export const LoginHistory = () => {
  const [history, setHistory] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("login_history")
        .select("*")
        .order("logged_in_at", { ascending: false })
        .limit(20);
      setHistory((data as LoginEntry[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const parseUA = (ua: string | null): string => {
    if (!ua) return "Bilinmeyen cihaz";
    if (ua.includes("Mobile")) return "📱 Mobil";
    if (ua.includes("Chrome")) return "🖥️ Chrome";
    if (ua.includes("Firefox")) return "🖥️ Firefox";
    if (ua.includes("Safari")) return "🖥️ Safari";
    return "🖥️ Masaüstü";
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        Giriş Geçmişi
      </h2>
      <div className="rounded-lg bg-card border border-border p-3 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-3">Henüz giriş kaydı yok</p>
        ) : (
          history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-md bg-secondary/30 px-2.5 py-2 text-[10px]"
            >
              <div className="flex items-center gap-2">
                <span>{parseUA(entry.user_agent)}</span>
                <span className="text-muted-foreground font-mono">
                  {entry.ip_address || "—"}
                </span>
              </div>
              <span className="text-muted-foreground">
                {new Date(entry.logged_in_at).toLocaleString("tr-TR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
