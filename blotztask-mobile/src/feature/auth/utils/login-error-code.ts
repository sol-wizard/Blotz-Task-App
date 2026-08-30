import { WebAuthErrorCodes } from "react-native-auth0";
import type { LoginErrorCode, LoginFailureReason } from "@/shared/constants/posthog-events";

const KNOWN_ERROR_CODES = new Set<string>(Object.values(WebAuthErrorCodes));

/**
 * Narrows an unknown thrown value to one of react-native-auth0's `WebAuthErrorCodes`.
 *
 * Duck-types `.type` rather than using `instanceof WebAuthError`: `authorize()` also
 * wraps `Auth0User.fromIdToken` and `credentialsManager.saveCredentials`, which throw
 * plain `Error` and `CredentialsManagerError` with no `.type`, and `instanceof` breaks
 * under duplicate module instances.
 *
 * Never returns anything outside the known codes, so the PostHog property stays bounded
 * at 18 values no matter what is thrown.
 */
export function toLoginErrorCode(error: unknown): LoginErrorCode {
  const type = (error as { type?: unknown } | null | undefined)?.type;

  return typeof type === "string" && KNOWN_ERROR_CODES.has(type)
    ? (type as LoginErrorCode)
    : WebAuthErrorCodes.UNKNOWN_ERROR;
}

/**
 * Splits login failures into the three buckets that have different fixes: the user
 * backed out, the browser closed under them, or Auth0 genuinely errored.
 */
export function toLoginFailureReason(code: LoginErrorCode): LoginFailureReason {
  if (code === WebAuthErrorCodes.USER_CANCELLED) return "cancelled";
  if (code === WebAuthErrorCodes.BROWSER_TERMINATED) return "browser_dismissed";
  return "auth0_error";
}
