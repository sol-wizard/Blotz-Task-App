import { auth0 } from "./auth0-client";

/**
 * Returns a valid access token, transparently refreshing it via the Auth0 SDK
 * when the cached one is expired. The SDK owns the refresh token and handles
 * rotation, so this is the single source of truth for tokens.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const credentials = await auth0.credentialsManager.getCredentials();
    return credentials.accessToken;
  } catch {
    // No stored credentials, or the session was revoked/expired.
    return null;
  }
}

/**
 * Forces a refresh that bypasses the cached access token. Used to retry once
 * after a 401 in case the access token was stale.
 */
export async function forceRefreshAuthToken(): Promise<string | null> {
  try {
    const credentials = await auth0.credentialsManager.getCredentials(
      undefined,
      0,
      undefined,
      true, // forceRefresh
    );
    return credentials.accessToken;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await auth0.credentialsManager.clearCredentials();
  } catch {
    // Nothing stored — ignore.
  }
}
