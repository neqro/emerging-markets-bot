import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode = "dark" | "light";
export type ThemePreset = "matrix" | "cyber" | "blood" | "ocean" | "sunset" | "custom";

interface ThemeConfig {
  mode: ThemeMode;
  preset: ThemePreset;
  customAccent?: string; // HSL string like "280 72% 50%"
}

interface ThemeContextType {
  theme: ThemeConfig;
  setMode: (mode: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
  setCustomAccent: (hsl: string) => void;
}

const presets: Record<ThemePreset, { primary: string; accent: string; label: string }> = {
  matrix: { primary: "142 72% 50%", accent: "38 92% 60%", label: "Matrix Green" },
  cyber: { primary: "199 89% 48%", accent: "262 83% 58%", label: "Cyber Blue" },
  blood: { primary: "0 72% 55%", accent: "38 92% 60%", label: "Blood Red" },
  ocean: { primary: "186 72% 50%", accent: "210 72% 60%", label: "Ocean Teal" },
  sunset: { primary: "25 95% 53%", accent: "340 82% 52%", label: "Sunset Orange" },
  custom: { primary: "280 72% 50%", accent: "38 92% 60%", label: "Custom" },
};

export { presets as themePresets };

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "solbot-theme";

function applyTheme(config: ThemeConfig) {
  const root = document.documentElement;

  // Light / dark mode
  if (config.mode === "light") {
    root.style.setProperty("--background", "210 20% 96%");
    root.style.setProperty("--foreground", "220 20% 12%");
    root.style.setProperty("--card", "0 0% 100%");
    root.style.setProperty("--card-foreground", "220 20% 12%");
    root.style.setProperty("--popover", "0 0% 100%");
    root.style.setProperty("--popover-foreground", "220 20% 12%");
    root.style.setProperty("--secondary", "220 14% 90%");
    root.style.setProperty("--secondary-foreground", "220 14% 30%");
    root.style.setProperty("--muted", "220 14% 92%");
    root.style.setProperty("--muted-foreground", "220 10% 45%");
    root.style.setProperty("--border", "220 14% 85%");
    root.style.setProperty("--input", "220 14% 85%");
    root.style.setProperty("--sidebar-background", "210 20% 94%");
    root.style.setProperty("--sidebar-foreground", "220 14% 30%");
    root.style.setProperty("--sidebar-accent", "220 14% 90%");
    root.style.setProperty("--sidebar-accent-foreground", "220 20% 12%");
    root.style.setProperty("--sidebar-border", "220 14% 85%");
  } else {
    root.style.setProperty("--background", "220 20% 6%");
    root.style.setProperty("--foreground", "160 10% 88%");
    root.style.setProperty("--card", "220 18% 9%");
    root.style.setProperty("--card-foreground", "160 10% 88%");
    root.style.setProperty("--popover", "220 18% 9%");
    root.style.setProperty("--popover-foreground", "160 10% 88%");
    root.style.setProperty("--secondary", "220 16% 14%");
    root.style.setProperty("--secondary-foreground", "160 10% 78%");
    root.style.setProperty("--muted", "220 14% 12%");
    root.style.setProperty("--muted-foreground", "220 10% 50%");
    root.style.setProperty("--border", "220 14% 16%");
    root.style.setProperty("--input", "220 14% 16%");
    root.style.setProperty("--sidebar-background", "220 20% 5%");
    root.style.setProperty("--sidebar-foreground", "160 10% 78%");
    root.style.setProperty("--sidebar-accent", "220 16% 14%");
    root.style.setProperty("--sidebar-accent-foreground", "160 10% 88%");
    root.style.setProperty("--sidebar-border", "220 14% 16%");
  }

  // Apply preset colors
  const preset = config.preset === "custom" && config.customAccent
    ? { primary: config.customAccent, accent: presets.custom.accent }
    : presets[config.preset];

  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--ring", preset.primary);
  root.style.setProperty("--chart-up", preset.primary);
  root.style.setProperty("--sidebar-primary", preset.primary);
  root.style.setProperty("--sidebar-ring", preset.primary);
  root.style.setProperty("--glow-primary", `0 0 20px hsl(${preset.primary} / 0.15)`);

  // Primary foreground based on mode
  if (config.mode === "light") {
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--sidebar-primary-foreground", "0 0% 100%");
  } else {
    root.style.setProperty("--primary-foreground", "220 20% 6%");
    root.style.setProperty("--sidebar-primary-foreground", "220 20% 6%");
  }
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { mode: "dark" as ThemeMode, preset: "matrix" as ThemePreset };
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  }, [theme]);

  const setMode = (mode: ThemeMode) => setTheme((t) => ({ ...t, mode }));
  const setPreset = (preset: ThemePreset) => setTheme((t) => ({ ...t, preset }));
  const setCustomAccent = (hsl: string) => setTheme((t) => ({ ...t, preset: "custom" as ThemePreset, customAccent: hsl }));

  return (
    <ThemeContext.Provider value={{ theme, setMode, setPreset, setCustomAccent }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
