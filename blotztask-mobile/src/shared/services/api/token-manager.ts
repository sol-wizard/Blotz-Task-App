import * as Sentry from "@sentry/react-native";
import { CredentialsManagerErrorCodes } from "react-native-auth0";
import { auth0 } from "./auth0-client";

/**
 * Silent refresh failures were the blind spot of the "returning user" chain: every request
 * goes through `getAuthToken()`, and when the SDK cannot renew the token the error was
 * swallowed and the request simply went out without a header. Report it once per window;
 * a burst of parallel requests would otherwise send one event each.
 */
const REPORT_WINDOW_MS = 5 * 60 * 1000;
let lastReportedAt = 0;

/* eslint-disable camelcase */
function reportRefreshFailure(error: unknown, durationMs: number) {
  const type = (error as { type?: unknown } | null | undefined)?.type;
  const code = typeof type === "string" ? type : "UNKNOWN";

  // No stored credentials at all: a logged-out user (or a fresh install) hitting an
  // endpoint that does not need a token, such as `/app-version`. Not a failure.
  if (code === CredentialsManagerErrorCodes.NO_CREDENTIALS) return;

  const now = Date.now();
  if (now - lastReportedAt < REPORT_WINDOW_MS) return;
  lastReportedAt = now;

  const message = (error as { message?: unknown } | null | undefined)?.message;
  Sentry.captureMessage("token_refresh_failed", {
    level: "warning",
    tags: { error_code: code },
    extra: {
      cause: typeof message === "string" ? message : String(error),
      duration_ms: durationMs,
    },
  });
}
/* eslint-enable camelcase */

// Returns a valid access token; the SDK refreshes/rotates it when expired.
export async function getAuthToken(): Promise<string | null> {
  const startedAt = Date.now();
  try {
    const { accessToken } = await auth0.credentialsManager.getCredentials();
    return accessToken;
  } catch (error) {
    reportRefreshFailure(error, Date.now() - startedAt);
    return null;
  }
}

async function refresh(): Promise<string | null> {
  try {
    const { accessToken } = await auth0.credentialsManager.getCredentials(
      undefined,
      0,
      undefined,
      true,
    );
    return accessToken;
  } catch {
    // The 401 path that calls this already records the outcome as `session_cleared_after_401`.
    return null;
  }
}

// Force a refresh after a 401, sharing one request across concurrent callers
// so parallel 401s can't trigger multiple token rotations.
let inFlightRefresh: Promise<string | null> | null = null;

export function forceRefreshAuthToken(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = refresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

export async function clearTokens(): Promise<void> {
  await auth0.credentialsManager.clearCredentials();
}
