import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from "expo-audio";
import type { MicPermissionOutcome } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";

/**
 * Resolves the mic permission, prompting only if the OS will still show a prompt, and reports
 * the outcome to analytics. Get-then-request (as in shared/services/notifications.ts) separates
 * denied from blocked. Never rejects: a failed check resolves as `error`.
 */
export async function resolveMicPermission(): Promise<MicPermissionOutcome> {
  try {
    const current = await getRecordingPermissionsAsync();

    if (current.granted) {
      analytics.trackMicPermissionResolved({ outcome: "already_granted" });
      return "already_granted";
    }

    // No prompt will be shown, so a request here is indistinguishable from a real rejection.
    if (!current.canAskAgain) {
      analytics.trackMicPermissionResolved({ outcome: "blocked" });
      return "blocked";
    }

    const requested = await requestRecordingPermissionsAsync();
    const outcome = requested.granted ? "granted" : "denied";
    analytics.trackMicPermissionResolved({ outcome });
    return outcome;
  } catch (error: unknown) {
    console.warn("[Mic] Permission check failed.", error);
    analytics.trackMicPermissionResolved({
      outcome: "error",
      errorCode: "PermissionCheckFailed",
    });
    return "error";
  }
}
