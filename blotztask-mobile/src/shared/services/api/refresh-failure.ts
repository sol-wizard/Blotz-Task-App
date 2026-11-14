import { CredentialsManagerErrorCodes } from "react-native-auth0";

export type RefreshFailureAction = "sign_out" | "keep";

export type RefreshFailure = {
  reason: string;
  action: RefreshFailureAction;
  /** Normalised by the RN SDK; `UNKNOWN_ERROR` when it has no mapping for `code`. */
  type: string;
  /** iOS: Auth0's raw code (`invalid_grant`, `a0.sdk.internal_error.plain`). Android: same as `type`. */
  code: string;
  name: string;
  status: number;
  nsurlCode: number | null;
  oauthError: string | null;
  oauthDescription: string | null;
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

function pickReason(failure: Omit<RefreshFailure, "reason" | "action">): {
  reason: string;
  action: RefreshFailureAction;
} {
  const { type, code, status, nsurlCode, oauthError } = failure;

  const signOutReason = SIGN_OUT_REASONS[type];
  if (signOutReason) return { reason: signOutReason, action: "sign_out" };

  if (nsurlCode !== null) return { reason: networkReason(nsurlCode), action: "keep" };
  if (code === "temporarily_unavailable" || oauthError === "temporarily_unavailable") {
    return { reason: "server_unavailable", action: "keep" };
  }
  if (type === CredentialsManagerErrorCodes.NO_NETWORK) {
    return { reason: "network", action: "keep" };
  }
  if (status === 429 || code === "too_many_requests" || oauthError === "too_many_requests") {
    return { reason: "rate_limited", action: "keep" };
  }
  if (type === CredentialsManagerErrorCodes.API_ERROR || status >= 500) {
    return { reason: "server_error", action: "keep" };
  }
  if (type === CredentialsManagerErrorCodes.STORE_FAILED) {
    return { reason: "store_failed", action: "keep" };
  }

  // Not seen yet (e.g. `access_denied`): losing the session costs more than failing a request.
  return { reason: "unknown", action: "keep" };
}

/** Works on anything thrown by `credentialsManager.getCredentials()`. */
export function classifyRefreshFailure(error: unknown): RefreshFailure {
  const e = (typeof error === "object" && error !== null ? error : {}) as Record<string, unknown>;
  const json = (typeof e.json === "object" && e.json !== null ? e.json : {}) as Record<
    string,
    unknown
  >;
  const message = readString(e.message) ?? String(error);

  const details = {
    type: readString(e.type) ?? "UNKNOWN",
    code: readString(e.code) ?? "unknown",
    name: readString(e.name) ?? "unknown",
    status: typeof e.status === "number" ? e.status : 0,
    nsurlCode: readNsurlCode(message),
    oauthError: readString(json.error),
    oauthDescription: readString(json.error_description),
    message,
  };

  return { ...details, ...pickReason(details) };
}
