import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";

const SCAN_INTERVAL = 30 * 1000; // 30 seconds

export const useAnalyzerScheduler = () => {
  const { session } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRunRef = useRef<number>(0);

  const triggerScan = useCallback(async () => {
    if (!session?.access_token) return;
    const now = Date.now();
    // Prevent double-runs within 60s
    if (now - lastRunRef.current < 60000) return;
    lastRunRef.current = now;

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/analyze-wallets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      console.log("[Scheduler] analyze-wallets result:", data?.signalsGenerated ?? 0, "signals");
    } catch (e) {
      console.error("[Scheduler] analyze-wallets error:", e);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    // Run immediately on mount
    triggerScan();

    // Then every 5 minutes
    timerRef.current = setInterval(triggerScan, SCAN_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, triggerScan]);

  return { triggerScan };
};
