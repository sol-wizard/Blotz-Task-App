import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * When this device last completed a login. Auth0 can't tell us later: failed refresh logs
 * carry no user id, and the user's `last_login` is overwritten as soon as they sign in again.
 * Lets a refresh failure say whether the session had reached the 90-day refresh-token limit.
 */
const STORAGE_KEY = "last_login_at";

export function rememberLogin() {
  AsyncStorage.setItem(STORAGE_KEY, String(Date.now())).catch(() => {});
}

export async function readLastLoginAt(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}
