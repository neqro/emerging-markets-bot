import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";
import { ChangePassword } from "@/components/security/ChangePassword";
import { SessionManager } from "@/components/security/SessionManager";
import { LoginHistory } from "@/components/security/LoginHistory";
import { DeleteAccount } from "@/components/security/DeleteAccount";

const Security = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background terminal-grid">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-foreground">{t("security.title")}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <TwoFactorSetup />
        <div className="border-t border-border" />
        <ChangePassword />
        <div className="border-t border-border" />
        <SessionManager />
        <div className="border-t border-border" />
        <LoginHistory />
        <div className="border-t border-border" />
        <DeleteAccount />
      </div>
    </div>
  );
};

export default Security;
