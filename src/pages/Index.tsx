import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { NewTokensPanel } from "@/components/dashboard/NewTokensPanel";
import { TrendingPanel } from "@/components/dashboard/TrendingPanel";
import { SignalsPanel } from "@/components/dashboard/SignalsPanel";
import { WalletTrackerPanel } from "@/components/dashboard/WalletTrackerPanel";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-screen bg-background terminal-grid">
      <StatusBar />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <StatsBar />

      <div className="flex-1 grid grid-cols-4 gap-4 px-6 pb-6 min-h-0">
        {/* New Tokens */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-4 overflow-hidden">
          <NewTokensPanel />
        </div>

        {/* Trending */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-4 overflow-hidden">
          <TrendingPanel />
        </div>

        {/* Bot Signals */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-4 overflow-hidden">
          <SignalsPanel />
        </div>

        {/* Wallet Tracker */}
        <div className="flex flex-col rounded-xl bg-card border border-border p-4 overflow-hidden">
          <WalletTrackerPanel />
        </div>
      </div>
    </div>
  );
};

export default Index;
