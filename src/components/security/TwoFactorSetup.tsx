import { useState, useEffect } from "react";
import { Shield, Smartphone, QrCode, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export const TwoFactorSetup = () => {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const loadFactors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data?.totp || []);
    } catch (e: any) {
      console.error("Load factors error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFactors(); }, []);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "SolBot Authenticator",
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (e: any) {
      toast.error(e.message || "2FA kurulumu başarısız");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      toast.success("2FA başarıyla etkinleştirildi!");
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerifyCode("");
      await loadFactors();
    } catch (e: any) {
      toast.error(e.message || "Doğrulama başarısız. Kodu kontrol edin.");
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async (fId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: fId });
      if (error) throw error;
      toast.success("2FA devre dışı bırakıldı");
      await loadFactors();
    } catch (e: any) {
      toast.error(e.message || "2FA devre dışı bırakılamadı");
    }
  };

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-primary" />
        İki Faktörlü Doğrulama (2FA)
      </h2>

      {verifiedFactors.length > 0 ? (
        <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono text-primary">2FA Aktif</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Google Authenticator ile korunuyor
          </p>
          {verifiedFactors.map((f) => (
            <div key={f.id} className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono">
                {f.friendly_name || "TOTP"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnenroll(f.id)}
                className="h-6 text-[10px] text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Kaldır
              </Button>
            </div>
          ))}
        </div>
      ) : qrCode ? (
        <div className="rounded-lg bg-card border border-border p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Google Authenticator veya benzeri bir uygulama ile QR kodu tarayın:
          </p>
          <div className="flex justify-center bg-secondary/50 rounded-lg p-4">
            <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48" />
          </div>
          {secret && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Manuel giriş kodu:</Label>
              <code className="block text-[10px] font-mono text-foreground bg-secondary/50 p-2 rounded break-all">
                {secret}
              </code>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Doğrulama Kodu</Label>
            <Input
              placeholder="6 haneli kod girin"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-xs h-9 bg-secondary border-border font-mono tracking-widest text-center"
              maxLength={6}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleVerify}
              disabled={verifying || verifyCode.length !== 6}
              className="flex-1 h-8 text-xs font-mono"
            >
              {verifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Doğrula ve Etkinleştir
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setQrCode(null); setSecret(null); setFactorId(null); }}
              className="h-8 text-xs"
            >
              İptal
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-card border border-border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">2FA henüz etkin değil</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Google Authenticator ile hesabınızı ekstra koruma altına alın.
          </p>
          <Button
            onClick={handleEnroll}
            disabled={enrolling}
            size="sm"
            className="h-8 text-xs font-mono"
          >
            {enrolling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <QrCode className="h-3 w-3 mr-1" />}
            2FA Etkinleştir
          </Button>
        </div>
      )}
    </section>
  );
};
