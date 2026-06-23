import { auth0 } from "./auth0-client";

// Returns a valid access token; the SDK refreshes/rotates it when expired.
export async function getAuthToken(): Promise<string | null> {
  try {
    const { accessToken } = await auth0.credentialsManager.getCredentials();
    return accessToken;
  } catch {
    return null;
  }
}

async function refresh(): Promise<string | null> {
  try {
    const { accessToken } = await auth0.credentialsManager.getCredentials(undefined, 0, undefined, true);
    return accessToken;
  } catch {
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
