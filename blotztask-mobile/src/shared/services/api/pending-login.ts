import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import { auth0 } from "@/shared/services/api/auth0-client";
import { analytics } from "@/shared/services/analytics";

/**
 * Marks a login as open while the user is in the Auth0 browser, so the next cold start can
 * tell that the app was killed mid-login.
 *
 * On Android the login runs in the browser with the app in the background, and the OS may
 * kill the app before the user finishes. The SDK keeps that login only in memory and the
 * activity's saved state, never on disk, so without this flag a killed login leaves no
 * trace: no result, no error, and the user lands back on sign-in.
 */
const STORAGE_KEY = "login_in_progress_started_at";

/**
 * An interrupted login older than this is reported but not announced: a user reopening the
 * app the next day does not remember the attempt, and a toast about it would only confuse.
 */
const INTERRUPTED_NOTICE_MAX_AGE_MS = 15 * 60_000;

let shouldNoticeInterruptedLogin = false;

export async function markLoginInProgress(startedAt: number) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(startedAt));
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "pending-login-mark" } });
  }
}

export async function clearLoginInProgress() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "pending-login-clear" } });
  }
}

/**
 * Runs once at cold start, before the auth check. If a login was still open when the app
 * died, tries to recover it, and otherwise records it as interrupted.
 *
 * `resumeSession()` is only called when the flag is set: with nothing buffered it waits a
 * 5 s grace window before resolving `null`, which every other launch would spend on the
 * splash screen.
 */
export async function recoverInterruptedLogin() {
  let startedAt: number;
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (value === null) return;
    startedAt = Number(value);
  } catch (e) {
    Sentry.captureException(e, { tags: { source: "pending-login-read" } });
    return;
  }
  await clearLoginInProgress();
  const msSinceLoginStarted = Date.now() - startedAt;

  // Android only: iOS presents the login inside the app, so there is nothing to resume.
  if (Platform.OS === "android") {
    try {
      const credentials = await auth0.webAuth.resumeSession();
      if (credentials) {
        // The class API, unlike the `useAuth0()` hook, does not store what it recovers.
        await auth0.credentialsManager.saveCredentials(credentials);
        analytics.trackLoginResumed({ msSinceLoginStarted });
        analytics.flush();
        return;
      }
    } catch (e) {
      Sentry.captureException(e, { tags: { source: "resume-session" } });
    }
  }

  analytics.trackLoginInterrupted({ msSinceLoginStarted });
  analytics.flush();
  shouldNoticeInterruptedLogin = msSinceLoginStarted <= INTERRUPTED_NOTICE_MAX_AGE_MS;
}

/** True once per launch if the sign-in screen should tell the user their last login was cut off. */
export function consumeInterruptedLoginNotice() {
  const shouldNotice = shouldNoticeInterruptedLogin;
  shouldNoticeInterruptedLogin = false;
  return shouldNotice;
}
