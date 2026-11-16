import { analytics } from "@/shared/services/analytics";
import { useMicPermission as useSharedMicPermission } from "@/shared/hooks/useMicPermission";

export type { MicPermissionStatus } from "@/shared/hooks/useMicPermission";

// onRefused runs once when the user turns the mic down, so each caller decides what a refusal
// means for it (the AI sheet records it as a failed generation; feedback does not).
export function useMicPermission(onRefused?: () => void) {
  return useSharedMicPermission((outcome, errorCode) => {
    analytics.trackMicPermissionResolved({ outcome, ...(errorCode ? { errorCode } : {}) });
    if (outcome === "denied" || outcome === "blocked") onRefused?.();
  });
}
