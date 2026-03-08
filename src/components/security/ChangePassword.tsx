import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export const ChangePassword = () => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (newPw.length < 6) {
      toast.error("Yeni şifre en az 6 karakter olmalı");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    try {
      // Verify current password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Kullanıcı bulunamadı");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signInError) {
        toast.error("Mevcut şifre yanlış");
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;

      toast.success("Şifre başarıyla değiştirildi!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e: any) {
      toast.error(e.message || "Şifre değiştirilemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        Şifre Değiştir
      </h2>
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Mevcut Şifre</Label>
          <Input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="text-xs h-9 bg-secondary border-border"
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Yeni Şifre</Label>
          <Input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="text-xs h-9 bg-secondary border-border"
            placeholder="En az 6 karakter"
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Yeni Şifre (Tekrar)</Label>
          <Input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="text-xs h-9 bg-secondary border-border"
            placeholder="••••••••"
          />
        </div>
        <Button
          onClick={handleChange}
          disabled={loading || !currentPw || !newPw || !confirmPw}
          size="sm"
          className="w-full h-8 text-xs font-mono"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Şifreyi Değiştir
        </Button>
      </div>
    </section>
  );
};
