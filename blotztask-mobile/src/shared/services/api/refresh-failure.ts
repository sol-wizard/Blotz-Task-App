import { CredentialsManagerErrorCodes } from "react-native-auth0";

export type RefreshFailureAction = "sign_out" | "keep";

/**
 * `code` of the error a request is rejected with when its token refresh failed and the
 * session was kept. It has no `response`, so it reads as a network error to the user, but
 * it is already reported as `token_refresh_failed` and retrying it only repeats the refresh.
 */
export const SESSION_KEPT_ERROR_CODE = "ERR_SESSION_KEPT";

export function isSessionKeptError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === SESSION_KEPT_ERROR_CODE
  );
}

/** `failure_reason` → action, from the PostHog flag. Wins over the built-in rules. */
export type RefreshFailureOverrides = Record<string, RefreshFailureAction>;

export type RefreshFailure = {
  reason: string;
  action: RefreshFailureAction;
  /** `remote` when the PostHog override decided the action instead of the built-in rules. */
  actionSource: "builtin" | "remote";
  /** Normalised by the RN SDK; `UNKNOWN_ERROR` when it has no mapping for `code`. */
  type: string;
  /** iOS: Auth0's raw code (`invalid_grant`, `a0.sdk.internal_error.plain`). Android: same as `type`. */
  code: string;
  name: string;
  nsurlCode: number | null;
  message: string;
};

const SIGN_OUT_REASONS: Record<string, string> = {
  // iOS `invalid_grant` / `invalid_refresh_token` and Android's deleted-or-invalid token
  // both arrive as RENEW_FAILED.
  [CredentialsManagerErrorCodes.RENEW_FAILED]: "token_invalid",
  [CredentialsManagerErrorCodes.NO_CREDENTIALS]: "no_credentials",
  [CredentialsManagerErrorCodes.NO_REFRESH_TOKEN]: "no_refresh_token",
  [CredentialsManagerErrorCodes.SESSION_EXPIRED]: "session_expired",
  [CredentialsManagerErrorCodes.INVALID_CREDENTIALS]: "invalid_credentials",
  [CredentialsManagerErrorCodes.DPOP_KEY_MISSING]: "dpop_key_missing",
  [CredentialsManagerErrorCodes.DPOP_KEY_MISMATCH]: "dpop_key_mismatch",
  [CredentialsManagerErrorCodes.DPOP_NOT_CONFIGURED]: "dpop_not_configured",
  [CredentialsManagerErrorCodes.CRYPTO_EXCEPTION]: "crypto_exception",
  [CredentialsManagerErrorCodes.INCOMPATIBLE_DEVICE]: "incompatible_device",
};

const NSURL_REASONS: Record<number, string> = {
  [-1009]: "network_offline",
  [-1003]: "network_dns",
  [-1005]: "network_lost",
  [-1001]: "network_timeout",
};

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// iOS hides network failures behind `UNKNOWN_ERROR`; only the message keeps the URLError,
// e.g. `Error Domain=NSURLErrorDomain Code=-1009 "The Internet connection appears to be offline."`.
function readNsurlCode(message: string): number | null {
  const match = /NSURLErrorDomain\D*?(-\d{3,5})/.exec(message);
  if (match) return Number(match[1]);
  return message.includes("NSURLErrorDomain") ? 0 : null;
}

function networkReason(nsurlCode: number): string {
  if (NSURL_REASONS[nsurlCode]) return NSURL_REASONS[nsurlCode];
  if (nsurlCode <= -1200 && nsurlCode > -1300) return "network_tls";
  return "network_other";
}

function pickReason(failure: Omit<RefreshFailure, "reason" | "action" | "actionSource">): {
  reason: string;
  action: RefreshFailureAction;
} {
  const { type, code, nsurlCode } = failure;

  const signOutReason = SIGN_OUT_REASONS[type];
  if (signOutReason) return { reason: signOutReason, action: "sign_out" };

  if (nsurlCode !== null) return { reason: networkReason(nsurlCode), action: "keep" };
  if (code === "temporarily_unavailable") {
    return { reason: "server_unavailable", action: "keep" };
  }
  if (type === CredentialsManagerErrorCodes.NO_NETWORK) {
    return { reason: "network", action: "keep" };
  }
  if (code === "too_many_requests") {
    return { reason: "rate_limited", action: "keep" };
  }
  if (type === CredentialsManagerErrorCodes.API_ERROR) {
    return { reason: "server_error", action: "keep" };
  }
  if (type === CredentialsManagerErrorCodes.STORE_FAILED) {
    return { reason: "store_failed", action: "keep" };
  }

  // Not seen yet (e.g. `access_denied`): losing the session costs more than failing a request.
  return { reason: "unknown", action: "keep" };
}

/**
 * Works on anything thrown by `credentialsManager.getCredentials()`.
 *
 * The SDK error's `status` and `json.error` are not read: the native bridge never sets
 * them (`status` is always 0, `json` is the raw native error), so only `type`, `code`,
 * `name` and `message` carry information.
 */
export function classifyRefreshFailure(
  error: unknown,
  overrides: RefreshFailureOverrides = {},
): RefreshFailure {
  const e = (typeof error === "object" && error !== null ? error : {}) as Record<string, unknown>;
  const message = readString(e.message) ?? String(error);

  const details = {
    type: readString(e.type) ?? "UNKNOWN",
    code: readString(e.code) ?? "unknown",
    name: readString(e.name) ?? "unknown",
    nsurlCode: readNsurlCode(message),
    message,
  };

  const { reason, action } = pickReason(details);
  const override = overrides[reason];

  return override === "sign_out" || override === "keep"
    ? { ...details, reason, action: override, actionSource: "remote" }
    : { ...details, reason, action, actionSource: "builtin" };
}
