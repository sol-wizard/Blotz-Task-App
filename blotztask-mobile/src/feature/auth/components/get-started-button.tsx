import React, { useEffect, useRef, useState } from "react";
import { useAuth0, WebAuthErrorCodes } from "react-native-auth0";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import Toast from "react-native-toast-message";
import i18n from "@/i18n";
import { AUTH_QUERY_KEY } from "@/shared/hooks/useAuth";
import { updateUserProfile } from "@/shared/services/user-service";
import { analytics } from "@/shared/services/analytics";
import { toLoginErrorCode, toLoginFailureReason } from "@/feature/auth/utils/login-error-code";
import type { LoginConnection, LoginErrorCode } from "@/shared/constants/posthog-events";
import { AppState, type AppStateStatus, Platform, Pressable, Text, View } from "react-native";
import {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = createAnimatedComponent(Pressable);

/**
 * How long the app may sit in the foreground with a login still pending before we call it
 * stalled. A healthy Android return delivers the result within 1–3 s of the app coming
 * back; the token exchange itself is capped at 10 s per host by the SDK.
 */
const STALL_TIMEOUT_MS = 15_000;

type LoginAttempt = {
  id: number;
  connection: LoginConnection;
  startedAt: number;
  /** Set once a `Stalled` failure has been recorded, so the SDK's late result is not double-counted. */
  stalled: boolean;
};

/**
 * Sends login failures to Sentry together with the raw cause.
 *
 * PostHog only receives the bounded `error_code`. The cause is an unbounded string (Auth0
 * descriptions, URLError text) and belongs here, where it can tell a DNS failure from a
 * TLS reset from a plain timeout.
 *
 * `USER_CANCELLED` is skipped on iOS, where it is the user's own action. On Android the SDK
 * reports it when the app returns to the foreground without callback data in its intent,
 * which is the exact signature of "the browser came back but the authorization code did
 * not", so it is recorded at `info` level with the elapsed time.
 */
/* eslint-disable camelcase */
function reportLoginFailure(error: unknown, errorCode: LoginErrorCode, durationMs: number) {
  const isCancel = errorCode === WebAuthErrorCodes.USER_CANCELLED;
  if (isCancel && Platform.OS !== "android") return;

  const message = (error as { message?: unknown } | null | undefined)?.message;
  Sentry.captureMessage("login_failed", {
    level: isCancel ? "info" : "warning",
    tags: { error_code: errorCode },
    extra: {
      cause: typeof message === "string" ? message : String(error),
      duration_ms: durationMs,
    },
  });
}

/**
 * Records a login whose result never came back. Fires PostHog `login_failed` with
 * `Stalled` so the funnel query counts it, and a Sentry message so the breadcrumbs (app
 * state changes, navigation) around it are kept.
 */
function reportLoginStalled(attempt: LoginAttempt, msSinceForeground: number) {
  const durationMs = Date.now() - attempt.startedAt;
  analytics.trackLoginFailed({
    connection: attempt.connection,
    reason: "stalled",
    errorCode: "Stalled",
    durationMs,
  });
  Sentry.captureMessage("login_stalled", {
    level: "warning",
    tags: { error_code: "Stalled" },
    extra: { duration_ms: durationMs, ms_since_foreground: msSinceForeground },
  });
}
/* eslint-enable camelcase */

/**
 * Cancellation is the user's own action and gets no toast. Everything else tells them what
 * happened, so a failed login no longer looks like a button that did nothing.
 */
function showLoginFailureToast(errorCode: LoginErrorCode) {
  if (errorCode === WebAuthErrorCodes.USER_CANCELLED) return;

  const key =
    errorCode === WebAuthErrorCodes.NETWORK_ERROR
      ? "errors.loginNetwork"
      : errorCode === WebAuthErrorCodes.TRANSACTION_ACTIVE_ALREADY
        ? "errors.loginInProgress"
        : errorCode === "Stalled"
          ? "errors.loginStalled"
          : "errors.loginFailed";

  Toast.show({ type: "error", text1: i18n.t(key) });
}

export default function GetStartedButton() {
  const { authorize } = useAuth0();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  const [isSigningIn, setIsSigningIn] = useState(false);
  // Ref rather than state for the guard: a second tap can land before the state update
  // from the first tap has re-rendered.
  const inFlight = useRef<LoginAttempt | null>(null);
  const attemptCounter = useRef(0);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStallTimer = () => {
    if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
  };

  const finishAttempt = (attempt: LoginAttempt) => {
    if (inFlight.current?.id !== attempt.id) return;
    clearStallTimer();
    inFlight.current = null;
    setIsSigningIn(false);
  };

  // Stall detection. The SDK can neither resolve nor reject when the activity waiting for
  // the redirect is recreated without its parameters, or when the callback reaches a fresh
  // SDK instance that has no PKCE verifier for it. From the user's side that is a button
  // stuck on "Signing in..." forever. The timer arms only on a transition back to the
  // foreground and disarms whenever the app leaves it, so time spent in the browser or on
  // a system dialog never counts.
  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      clearStallTimer();
      const attempt = inFlight.current;
      if (state !== "active" || !attempt || attempt.stalled) return;

      const foregroundAt = Date.now();
      stallTimer.current = setTimeout(() => {
        stallTimer.current = null;
        if (inFlight.current?.id !== attempt.id) return;

        attempt.stalled = true;
        reportLoginStalled(attempt, Date.now() - foregroundAt);
        analytics.flush();
        showLoginFailureToast("Stalled");
        // Release the button. On Android a new `authorize()` starts a fresh transaction and
        // browser session, which is the only recovery short of restarting the app.
        inFlight.current = null;
        setIsSigningIn(false);
      }, STALL_TIMEOUT_MS);
    };

    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      subscription.remove();
      clearStallTimer();
    };
  }, []);

  const signIn = async (connection?: string) => {
    // A second `authorize()` while the browser is still coming up hits the SDK's
    // transaction lock and surfaces as TRANSACTION_ACTIVE_ALREADY.
    if (inFlight.current) return;

    const attempt: LoginAttempt = {
      id: ++attemptCounter.current,
      connection: connection === "sms" ? "sms" : "default",
      startedAt: Date.now(),
      stalled: false,
    };
    inFlight.current = attempt;
    setIsSigningIn(true);

    analytics.trackLoginStarted({ connection: attempt.connection });

    try {
      const result = await authorize({
        audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email offline_access",
        connection,
      });

      if (!result?.accessToken || !result?.refreshToken) {
        console.error("No access token received from Auth0");
        const durationMs = Date.now() - attempt.startedAt;
        if (!attempt.stalled) {
          analytics.trackLoginFailed({
            connection: attempt.connection,
            reason: "no_tokens",
            errorCode: "NoTokensReturned",
            durationMs,
          });
          reportLoginFailure(result, "NoTokensReturned", durationMs);
          analytics.flush();
          showLoginFailureToast("NoTokensReturned");
        }
        return;
      }

      // Tracked before the redirect so it lands on the same anonymous distinct_id as
      // `login_started`, keeping the whole funnel on one identity until `$identify`.
      // A stalled attempt that resolves late is still a real success: the tokens are valid
      // and the user gets in. `after_stall` keeps it distinguishable in the funnel.
      analytics.trackLoginSucceeded({
        connection: attempt.connection,
        durationMs: Date.now() - attempt.startedAt,
        afterStall: attempt.stalled,
      });
      analytics.flush();

      // `authorize()` saved the credentials a moment ago, so the auth state is known.
      // Write it directly instead of invalidating the query and racing the `/(protected)`
      // guard, which would bounce the user through the sign-in screen first.
      queryClient.setQueryData(AUTH_QUERY_KEY, true);
      router.replace({ pathname: "/(protected)", params: { entry: "login" } });

      // Non-critical write. It must not delay the redirect: the API timeout is 30s, and on a
      // slow connection that is 30s of staring at the sign-in screen after a successful login.
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      void updateUserProfile({ timezone }).catch((e: unknown) => {
        Sentry.captureException(e, { tags: { source: "post-login-timezone" } });
      });
    } catch (e) {
      console.error("Auth0 authorization error:", e);
      // A stalled attempt has already been counted as a failure; its late rejection is
      // just the SDK catching up (typically USER_CANCELLED on the next foreground).
      if (attempt.stalled) return;

      // This branch catches user cancellation as well as genuine errors — `reason` is
      // what tells them apart.
      const errorCode = toLoginErrorCode(e);
      const durationMs = Date.now() - attempt.startedAt;
      analytics.trackLoginFailed({
        connection: attempt.connection,
        reason: toLoginFailureReason(errorCode),
        errorCode,
        durationMs,
      });
      reportLoginFailure(e, errorCode, durationMs);
      analytics.flush();
      showLoginFailureToast(errorCode);
    } finally {
      finishAttempt(attempt);
    }
  };

  const showPhone = process.env.EXPO_PUBLIC_APP_ENV !== "production";

  return (
    <View style={{ gap: 12, width: "100%" }}>
      <PillButton
        label={isSigningIn ? t("buttons.signingIn") : t("buttons.continue")}
        onPress={() => signIn()}
        variant="primary"
        disabled={isSigningIn}
      />
      {showPhone && (
        <PillButton
          label={t("buttons.continueWithPhone")}
          onPress={() => signIn("sms")}
          variant="secondary"
          disabled={isSigningIn}
        />
      )}
    </View>
  );
}

function PillButton({
  label,
  onPress,
  variant,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    width: "100%",
  }));

  const isPrimary = variant === "primary";

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={[
        animatedStyle,
        {
          paddingVertical: 16,
          borderRadius: 999,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isPrimary ? "#000000" : "#ffffff",
          borderWidth: isPrimary ? 0 : 1.5,
          borderColor: "#000000",
          boxShadow: isPrimary ? "0 10px 24px rgba(0, 0, 0, 0.18)" : undefined,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text
        className="font-balooBold text-lg"
        style={{
          color: isPrimary ? "#ffffff" : "#000000",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
