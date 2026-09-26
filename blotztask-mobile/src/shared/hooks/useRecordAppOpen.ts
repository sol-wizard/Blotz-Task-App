import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { format } from "date-fns";
import { recordUserActivity } from "@/shared/services/user-service";

/**
 * Records that the user opened the app today, for "days active" in the monthly review.
 * Runs on mount and whenever the app returns to the foreground, so a session left open past
 * midnight still records the new day.
 */
export function useRecordAppOpen() {
  // Kept in memory rather than AsyncStorage: this layout unmounts on logout, so the next account
  // on the device starts clean. A cold start costs one repeat call, which the server ignores.
  const lastRecordedDay = useRef<string | null>(null);
  const isRecording = useRef(false);

  useEffect(() => {
    const record = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      if (isRecording.current || lastRecordedDay.current === today) return;

      isRecording.current = true;
      try {
        await recordUserActivity(Intl.DateTimeFormat().resolvedOptions().timeZone || undefined);
        lastRecordedDay.current = today;
      } catch {
        // Invisible by design: a missed call only lowers a stat, and the next foreground retries.
      } finally {
        isRecording.current = false;
      }
    };

    if (AppState.currentState === "active") void record();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void record();
    });

    return () => subscription.remove();
  }, []);
}
