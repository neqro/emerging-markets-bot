import { Activity, Circle, Wifi } from "lucide-react";

export const StatusBar = () => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-xs text-muted-foreground">SOLANA CHAIN</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wifi className="h-3 w-3 text-primary" />
          <span>Connected</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Activity className="h-3 w-3" />
          <span>Bot: <span className="text-accent">Idle</span></span>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
