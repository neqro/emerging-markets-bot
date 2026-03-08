import { useState } from "react";
import { Sparkles, TrendingUp, Radio, Eye, BarChart3, Wallet } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { NewTokensPanel } from "@/components/dashboard/NewTokensPanel";
import { TrendingPanel } from "@/components/dashboard/TrendingPanel";
import { SignalsPanel } from "@/components/dashboard/SignalsPanel";
import { WalletTrackerPanel } from "@/components/dashboard/WalletTrackerPanel";
import { WalletPanel } from "@/components/dashboard/WalletPanel";
import { PositionsPanel } from "@/components/dashboard/PositionsPanel";
import { useAnalyzerScheduler } from "@/hooks/useAnalyzerScheduler";

const tabs = [
  { id: "new", label: "Yeni", icon: Sparkles },
  { id: "trending", label: "Trend", icon: TrendingUp },
  { id: "signals", label: "Sinyal", icon: Radio },
  { id: "wallets", label: "Whale", icon: Eye },
  { id: "positions", label: "PnL", icon: BarChart3 },
  { id: "wallet", label: "Cüzdan", icon: Wallet },
] as const;

type TabId = (typeof tabs)[number]["id"];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("signals");
  useAnalyzerScheduler();

  const renderPanel = (id: TabId) => {
    switch (id) {
      case "new": return <NewTokensPanel />;
      case "trending": return <TrendingPanel />;
      case "signals": return <SignalsPanel />;
      case "wallets": return <WalletTrackerPanel />;
      case "positions": return <PositionsPanel />;
      case "wallet": return <WalletPanel />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background terminal-grid">
      <StatusBar />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      {/* Stats - hidden on mobile */}
      <div className="hidden lg:block">
        <StatsBar />
      </div>

      {/* Desktop: 6-col grid */}
      <div className="hidden lg:grid flex-1 grid-cols-6 gap-3 px-4 pb-4 min-h-0">
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <NewTokensPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <TrendingPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <SignalsPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <WalletTrackerPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <PositionsPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <WalletPanel />
        </div>
      </div>

      {/* Tablet: 3-col grid */}
      <div className="hidden md:grid lg:hidden flex-1 grid-cols-3 gap-3 px-3 pb-16 min-h-0">
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <NewTokensPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <TrendingPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <SignalsPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <WalletTrackerPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <PositionsPanel />
        </div>
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <WalletPanel />
        </div>
      </div>

      {/* Mobile: Single panel with tab nav */}
      <div className="flex flex-col flex-1 md:hidden min-h-0">
        <div className="flex-1 overflow-hidden">
          <div className="h-full rounded-xl bg-card border border-border mx-3 mb-2 p-3 overflow-y-auto">
            {renderPanel(activeTab)}
          </div>
        </div>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border px-1 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-14">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <tab.icon className={`h-4 w-4 ${isActive ? "drop-shadow-[0_0_6px_hsl(var(--primary))]" : ""}`} />
                  <span className="text-[9px] font-mono uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Index;
