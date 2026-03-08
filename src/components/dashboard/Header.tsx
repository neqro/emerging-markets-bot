import { Bot, Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useProfile } from "@/hooks/useProfile";
import { User } from "lucide-react";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header = ({ searchQuery, onSearchChange }: HeaderProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile } = useProfile();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-lg bg-primary/10 glow-primary">
          <Bot className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base md:text-lg font-display font-bold tracking-tight text-foreground">Auto Solana Bot</h1>
          <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:block">
            {t("auth.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("header.search")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-40 md:w-64 h-8 text-xs bg-secondary border-border"
          />
        </div>

        {/* Profile avatar */}
        <button onClick={() => navigate("/settings")} className="flex items-center gap-1.5">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border border-primary/30" />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
        </button>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/settings")}>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
};
