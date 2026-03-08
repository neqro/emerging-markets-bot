import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

export const SolanaWalletProvider = ({ children }: { children: ReactNode }) => {
  const endpoint = useMemo(() => clusterApiUrl("mainnet-beta"), []);
  const wallets = useMemo(() => [], []); // auto-detect installed wallets (Phantom, Solflare, etc.)

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
