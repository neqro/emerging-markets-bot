import { ArrowLeft, Sun, Moon, Palette, Monitor, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme, themePresets, ThemePreset } from "@/hooks/useTheme";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setMode, setPreset, setCustomAccent } = useTheme();
  const [customH, setCustomH] = useState("280");
  const [customS, setCustomS] = useState("72");
  const [customL, setCustomL] = useState("50");

  const applyCustom = () => {
    setCustomAccent(`${customH} ${customS}% ${customL}%`);
  };

  return (
    <div className="min-h-screen bg-background terminal-grid">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-display font-bold text-foreground">Ayarlar</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Mode Toggle */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            Görünüm Modu
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
              Dark Mode
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
              Light Mode
            </button>
          </div>
        </section>

        {/* Theme Presets */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Terminal Teması
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
                <div
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ background: `hsl(${val.primary})` }}
                />
                {val.label}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Color */}
        <section className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            🎨 Özel Renk
          </h2>
          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg border border-border shrink-0"
                style={{ background: `hsl(${customH}, ${customS}%, ${customL}%)` }}
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-6">H</Label>
                  <Input
                    type="range" min="0" max="360" value={customH}
                    onChange={(e) => setCustomH(e.target.value)}
                    className="h-2 p-0 border-0"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{customH}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-6">S</Label>
                  <Input
                    type="range" min="0" max="100" value={customS}
                    onChange={(e) => setCustomS(e.target.value)}
                    className="h-2 p-0 border-0"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{customS}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground w-6">L</Label>
                  <Input
                    type="range" min="0" max="100" value={customL}
                    onChange={(e) => setCustomL(e.target.value)}
                    className="h-2 p-0 border-0"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{customL}%</span>
                </div>
              </div>
            </div>
            <Button onClick={applyCustom} size="sm" className="w-full h-8 text-xs font-mono">
              Özel Rengi Uygula
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
