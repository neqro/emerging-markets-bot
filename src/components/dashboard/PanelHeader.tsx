import { type LucideIcon } from "lucide-react";

interface PanelHeaderProps {
  title: string;
  icon: LucideIcon;
  count?: number;
  badge?: string;
  accent?: "primary" | "accent" | "destructive";
}

export const PanelHeader = ({ title, icon: Icon, count, badge, accent = "primary" }: PanelHeaderProps) => {
  const accentColors = {
    primary: "text-primary bg-primary/10",
    accent: "text-accent bg-accent/10",
    destructive: "text-destructive bg-destructive/10",
  };

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className={`h-6 w-6 rounded flex items-center justify-center ${accentColors[accent]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h2 className="text-sm font-display font-semibold text-foreground uppercase tracking-wide">
          {title}
        </h2>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
          {count}
        </span>
      )}
    </div>
  );
};
