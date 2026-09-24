import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from "expo-audio";
import * as Linking from "expo-linking";
import { analytics } from "@/shared/services/analytics";
import type { MicPermissionOutcome } from "@/shared/constants/posthog-events";

// A bare read cannot tell `undetermined` from `denied` on Android (both are granted: false,
// canAskAgain: true), so `denied` is only ever reached by asking. iOS clears canAskAgain on the
// first rejection, so it goes straight to `blocked`.
export type MicPermissionStatus = "checking" | "undetermined" | "granted" | "denied" | "blocked";

export function useMicPermission() {
  const [status, setStatus] = useState<MicPermissionStatus>("checking");

  // Report once per sheet open; repeated mic taps would inflate the failure funnel.
  const hasReportedOutcome = useRef(false);

  const report = useCallback((outcome: MicPermissionOutcome, errorCode?: string) => {
    if (hasReportedOutcome.current) return;
    hasReportedOutcome.current = true;

    analytics.trackMicPermissionResolved({ outcome, ...(errorCode ? { errorCode } : {}) });

    if (outcome === "denied" || outcome === "blocked") {
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "permission",
        errorCode: "PermissionDenied",
      });
    }
  }, []);

  // Read the current grant without prompting, so opening the sheet never shows a system alert.
  // Re-runs on foreground: the user may have just flipped the switch in Settings.
  useEffect(() => {
    let isActive = true;

    const readPermission = async () => {
      try {
        const current = await getRecordingPermissionsAsync();
        if (!isActive) return;

        if (current.granted) {
          setStatus("granted");
          report("already_granted");
          return;
        }

        // Leave an in-session `denied` alone; a re-read would downgrade it to `undetermined`.
        setStatus((previous) => {
          if (!current.canAskAgain) return "blocked";
          return previous === "denied" ? "denied" : "undetermined";
        });
      } catch (error) {
        if (!isActive) return;
        console.warn("[Mic] Permission check failed.", error);
        setStatus("undetermined");
        report("error", "PermissionCheckFailed");
      }
    };

    void readPermission();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void readPermission();
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [report]);

  // Resolves to the resulting status, not a boolean: `blocked` is the one answer the OS gives
  // silently, so the caller has to explain that case itself. Never starts a recording.
  const requestMic = useCallback(async (): Promise<MicPermissionStatus> => {
    if (status === "granted") return "granted";

    // No alert would appear, so asking here is indistinguishable from a real rejection.
    if (status === "blocked") {
      report("blocked");
      return "blocked";
    }

    try {
      const requested = await requestRecordingPermissionsAsync();

      if (requested.granted) {
        setStatus("granted");
        report("granted");
        return "granted";
      }

      const outcome = requested.canAskAgain ? "denied" : "blocked";
      setStatus(outcome);
      report(outcome);
      return outcome;
    } catch (error) {
      console.warn("[Mic] Permission request failed.", error);
      report("error", "PermissionRequestFailed");
      return status;
    }
  }, [status, report]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch((error: unknown) =>
      console.warn("[Mic] Failed to open system settings.", error),
    );
  }, []);

  return {
    status,
    isMicUsable: status === "granted",
    isMicRefused: status === "denied" || status === "blocked",
    needsSettings: status === "blocked",
    requestMic,
    openSettings,
  };
}
