import { useEffect, useState } from "react";

interface FarcasterContext {
  isMiniApp: boolean;
  isReady: boolean;
  user?: { fid: number; username?: string; displayName?: string };
}

export const useFarcaster = (): FarcasterContext => {
  const [state, setState] = useState<FarcasterContext>({
    isMiniApp: false,
    isReady: false,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { sdk } = await import("@farcaster/miniapp-sdk");
        
        // Check if running inside Farcaster
        const isInFrame = window.self !== window.top || 
          navigator.userAgent.includes("Farcaster") ||
          new URLSearchParams(window.location.search).has("fc_frame");
        
        if (isInFrame) {
          await sdk.actions.ready();
          const context = await sdk.context;
          setState({
            isMiniApp: true,
            isReady: true,
            user: context?.user ? {
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
            } : undefined,
          });
        } else {
          setState({ isMiniApp: false, isReady: true });
        }
      } catch {
        setState({ isMiniApp: false, isReady: true });
      }
    };

    init();
  }, []);

  return state;
};
