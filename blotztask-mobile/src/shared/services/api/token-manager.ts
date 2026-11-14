import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import { CredentialsManagerErrorCodes } from "react-native-auth0";
import { auth0 } from "./auth0-client";
import { classifyRefreshFailure, type RefreshFailure } from "./refresh-failure";
import { readLastLoginAt } from "./last-login";

export type RefreshEntryPoint = "request" | "retry_401";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sentry tags and extras for a refresh failure, shared by `token_refresh_failed` and
 * `session_cleared_after_401`. Keys avoid "token" and "auth": Sentry's scrubber replaces
 * their values with `[Filtered]`.
 */
/* eslint-disable camelcase */
export async function describeRefreshFailure(
  failure: RefreshFailure,
  entryPoint: RefreshEntryPoint,
) {
  const lastLoginAt = await readLastLoginAt();
  return {
    tags: {
      error_code: failure.type,
      failure_reason: failure.reason,
      failure_action: failure.action,
      failure_code: failure.code,
      failure_name: failure.name,
      http_status: String(failure.status),
      nsurl_code: failure.nsurlCode === null ? "none" : String(failure.nsurlCode),
      idp_error: failure.oauthError ?? "none",
      entry_point: entryPoint,
      platform: Platform.OS,
      days_since_login:
        lastLoginAt === null ? "unknown" : String(Math.floor((Date.now() - lastLoginAt) / DAY_MS)),
    },
    extra: {
      message: failure.message,
      idp_description: failure.oauthDescription,
      last_login_at: lastLoginAt === null ? null : new Date(lastLoginAt).toISOString(),
    },
  };
}

/**
 * Silent refresh failures were the blind spot of the "returning user" chain: every request
 * goes through `getAuthToken()`, and when the SDK cannot renew the token the error was
 * swallowed and the request simply went out without a header. Parallel requests already
 * share one refresh; the window per reason stops an offline user from reporting every
 * screen they open, without letting a network blip hide a real token failure.
 */
const REPORT_WINDOW_MS = 5 * 60 * 1000;
const lastReportedAt = new Map<string, number>();

async function reportRefreshFailure(error: unknown, durationMs: number) {
  const failure = classifyRefreshFailure(error);

  // No stored credentials at all: a logged-out user (or a fresh install) hitting an
  // endpoint that does not need a token. Not a failure.
  if (failure.type === CredentialsManagerErrorCodes.NO_CREDENTIALS) return;

  const now = Date.now();
  if (now - (lastReportedAt.get(failure.reason) ?? 0) < REPORT_WINDOW_MS) return;
  lastReportedAt.set(failure.reason, now);

  const { tags, extra } = await describeRefreshFailure(failure, "request");
  Sentry.captureMessage("token_refresh_failed", {
    level: "warning",
    tags,
    extra: { ...extra, duration_ms: durationMs },
  });
}
/* eslint-enable camelcase */

async function loadAuthToken(): Promise<string | null> {
  const startedAt = Date.now();
  try {
    const { accessToken } = await auth0.credentialsManager.getCredentials();
    return accessToken;
  } catch (error) {
    reportRefreshFailure(error, Date.now() - startedAt).catch(() => {});
    return null;
  }
}

// Returns a valid access token; the SDK refreshes/rotates it when expired.
// Parallel requests share one call: the native SDK queues them, and each queued call
// would retry the refresh on its own after the first one fails.
let inFlightToken: Promise<string | null> | null = null;

export function getAuthToken(): Promise<string | null> {
  if (!inFlightToken) {
    inFlightToken = loadAuthToken().finally(() => {
      inFlightToken = null;
    });
  }
  return inFlightToken;
}

// Rejects with the SDK error: the 401 path classifies it into `session_cleared_after_401`.
async function refresh(): Promise<string> {
  const { accessToken } = await auth0.credentialsManager.getCredentials(
    undefined,
    0,
    undefined,
    true,
  );
  return accessToken;
}

// Force a refresh after a 401, sharing one request across concurrent callers
// so parallel 401s can't trigger multiple token rotations.
let inFlightRefresh: Promise<string> | null = null;

export function forceRefreshAuthToken(): Promise<string> {
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
