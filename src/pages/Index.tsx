import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { NewTokensPanel } from "@/components/dashboard/NewTokensPanel";
import { TrendingPanel } from "@/components/dashboard/TrendingPanel";
import { SignalsPanel } from "@/components/dashboard/SignalsPanel";
import { WalletTrackerPanel } from "@/components/dashboard/WalletTrackerPanel";
import { WalletPanel } from "@/components/dashboard/WalletPanel";
import { PositionsPanel } from "@/components/dashboard/PositionsPanel";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-screen bg-background terminal-grid">
      <StatusBar />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <StatsBar />

      <div className="flex-1 grid grid-cols-6 gap-3 px-4 pb-4 min-h-0">
        {/* New Tokens */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <NewTokensPanel />
        </div>

        {/* Trending */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <TrendingPanel />
        </div>

        {/* Bot Signals */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <SignalsPanel />
        </div>

        {/* Wallet Tracker */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <WalletTrackerPanel />
        </div>

        {/* Open Positions & PnL */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <PositionsPanel />
        </div>

        {/* User Wallet & Trading */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-3 overflow-hidden">
          <WalletPanel />
        </div>
      </div>
    </div>
  );
};

export default Index;
