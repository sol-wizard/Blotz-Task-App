import posthog from "@/shared/constants/posthog-client";
import {
  classifyRefreshFailure,
  type RefreshFailure,
  type RefreshFailureOverrides,
} from "./refresh-failure";

/**
 * PostHog feature flag whose JSON payload maps a `failure_reason` to `"sign_out"` or
 * `"keep"`, e.g. `{ "token_invalid": "keep", "unknown": "sign_out" }`.
 *
 * OTA updates are off, so without this a wrong rule could only be fixed by a store release.
 * The SDK loads every flag at launch and caches it, so reading the payload costs no request.
 */
export const REFRESH_FAILURE_FLAG = "refresh-failure-actions";

// Anything that is not exactly `sign_out` or `keep` is dropped: a typo in the dashboard
// must fall back to the built-in rule, not change who gets signed out.
export function parseRefreshFailureOverrides(payload: unknown): RefreshFailureOverrides {
  let value = payload;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  const overrides: RefreshFailureOverrides = {};
  for (const [reason, action] of Object.entries(value)) {
    if (action === "sign_out" || action === "keep") overrides[reason] = action;
  }
  return overrides;
}

/** The built-in rules, unless the flag says otherwise. Unset or not loaded yet: built-in. */
export function resolveRefreshFailure(error: unknown): RefreshFailure {
  let overrides: RefreshFailureOverrides = {};
  try {
    overrides = parseRefreshFailureOverrides(posthog.getFeatureFlagPayload(REFRESH_FAILURE_FLAG));
  } catch {
    // Reading a flag must never be the reason a refresh failure goes unhandled.
  }
  return classifyRefreshFailure(error, overrides);
}
