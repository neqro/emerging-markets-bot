import { ArrowLeft, Sun, Moon, Monitor, Palette, Shield, ChevronRight, Key, User, Globe, Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useTheme, themePresets, ThemePreset } from "@/hooks/useTheme";
import { useLanguage, Language } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { ExportKeyDialog } from "@/components/dashboard/ExportKeyDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setMode, setPreset, setCustomAccent } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { profile, updateProfile } = useProfile();
  const { wallet } = useWallet();
  const { user } = useAuth();

  const [customH, setCustomH] = useState("280");
  const [customS, setCustomS] = useState("72");
  const [customL, setCustomL] = useState("50");

  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [exportKeyOpen, setExportKeyOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const applyCustom = () => {
    setCustomAccent(`${customH} ${customS}% ${customL}%`);
  };

  const handleSaveProfile = async () => {
    const { error } = await updateProfile({ username: username || null, avatar_url: avatarUrl || null }) || {};
    if (!error) toast.success(t("settings.profileSaved"));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("Max 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Append timestamp to bust cache
      const url = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);
      await updateProfile({ avatar_url: url });
      toast.success(t("settings.avatarUploaded"));
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: "tr", label: "Türkçe", flag: "🇹🇷" },
    { value: "en", label: "English", flag: "🇺🇸" },
  ];

  return (
    <div className="min-h-screen bg-background terminal-grid">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-display font-bold text-foreground">{t("settings.title")}</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">

        {/* Profile */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {t("settings.profile")}
          </h2>
          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-14 w-14 rounded-full object-cover border-2 border-primary/30" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center border-2 border-card hover:bg-primary/80 transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
                  ) : (
                    <Camera className="h-3 w-3 text-primary-foreground" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">{t("settings.username")}</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("settings.usernamePlaceholder")}
                    className="h-8 text-xs bg-secondary border-border"
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleSaveProfile} size="sm" className="w-full h-8 text-xs font-mono">
              {t("settings.saveProfile")}
            </Button>
          </div>
        </section>

        {/* Language */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            {t("settings.language")}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => {
                  setLanguage(lang.value);
                  updateProfile({ language: lang.value });
                }}
                className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-mono transition-all ${
                  language === lang.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </section>

        {/* Mode Toggle */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            {t("settings.appearance")}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("dark")}
              className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-mono transition-all ${
                theme.mode === "dark"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <Moon className="h-4 w-4" />
              {t("common.dark")}
            </button>
            <button
              onClick={() => setMode("light")}
              className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-mono transition-all ${
                theme.mode === "light"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <Sun className="h-4 w-4" />
              {t("common.light")}
            </button>
          </div>
        </section>

        {/* Theme Presets */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            {t("settings.theme")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(themePresets) as [ThemePreset, typeof themePresets.matrix][]).filter(([k]) => k !== "custom").map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-mono transition-all ${
                  theme.preset === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <div className="h-4 w-4 rounded-full shrink-0" style={{ background: `hsl(${val.primary})` }} />
                {val.label}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Color */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            🎨 {t("settings.customColor")}
          </h2>
          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg border border-border shrink-0" style={{ background: `hsl(${customH}, ${customS}%, ${customL}%)` }} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-6">H</Label>
                  <Input type="range" min="0" max="360" value={customH} onChange={(e) => setCustomH(e.target.value)} className="h-2 p-0 border-0" />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{customH}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-6">S</Label>
                  <Input type="range" min="0" max="100" value={customS} onChange={(e) => setCustomS(e.target.value)} className="h-2 p-0 border-0" />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{customS}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-6">L</Label>
                  <Input type="range" min="0" max="100" value={customL} onChange={(e) => setCustomL(e.target.value)} className="h-2 p-0 border-0" />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{customL}%</span>
                </div>
              </div>
            </div>
            <Button onClick={applyCustom} size="sm" className="w-full h-8 text-xs font-mono">
              {t("settings.applyCustom")}
            </Button>
          </div>
        </section>

        {/* Security */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {t("settings.security")}
          </h2>
          <button
            onClick={() => navigate("/security")}
            className="w-full flex items-center justify-between rounded-lg bg-card border border-border p-3 text-xs font-mono text-foreground hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span>{t("settings.securityDesc")}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </section>

        {/* Private Key Export */}
        {wallet && (
          <section className="space-y-3">
            <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-destructive" />
              {t("settings.privateKey")}
            </h2>
            <button
              onClick={() => setExportKeyOpen(true)}
              className="w-full flex items-center justify-between rounded-lg bg-card border border-destructive/20 p-3 text-xs font-mono text-foreground hover:border-destructive/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-destructive/70" />
                <span>{t("settings.privateKeyDesc")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </section>
        )}
      </div>

      <ExportKeyDialog open={exportKeyOpen} onOpenChange={setExportKeyOpen} />
    </div>
  );
};

export default Settings;
