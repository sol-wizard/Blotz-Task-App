import { analytics } from "@/shared/services/analytics";
import { useMicPermission as useSharedMicPermission } from "@/shared/hooks/useMicPermission";

export type { MicPermissionStatus } from "@/shared/hooks/useMicPermission";

export function useMicPermission() {
  return useSharedMicPermission((outcome, errorCode) => {
    analytics.trackMicPermissionResolved({ outcome, ...(errorCode ? { errorCode } : {}) });
    if (outcome === "denied" || outcome === "blocked") {
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "permission",
        errorCode: "PermissionDenied",
      });
    }
  });
}
