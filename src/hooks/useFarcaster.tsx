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
        
        // Always call ready() — Farcaster validator needs it
        await sdk.actions.ready();
        const context = await sdk.context;
        
        if (context?.user) {
          setState({
            isMiniApp: true,
            isReady: true,
            user: {
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
            },
          });
        } else {
          setState({ isMiniApp: true, isReady: true });
        }
      } catch {
        // Not in Farcaster context
        setState({ isMiniApp: false, isReady: true });
      }
    };

    init();
  }, []);

  return state;
};
