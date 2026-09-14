import React, { useRef, useState } from "react";
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
import { Pressable, Text, View } from "react-native";
import {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = createAnimatedComponent(Pressable);

/**
 * Sends non-cancellation login failures to Sentry together with the raw cause.
 *
 * PostHog only receives the bounded `error_code`. The cause is an unbounded string (Auth0
 * descriptions, URLError text) and belongs here, where it can tell a DNS failure from a
 * TLS reset from a plain timeout.
 */
/* eslint-disable camelcase */
function reportLoginFailure(error: unknown, errorCode: LoginErrorCode, durationMs: number) {
  if (errorCode === WebAuthErrorCodes.USER_CANCELLED) return;

  const message = (error as { message?: unknown } | null | undefined)?.message;
  Sentry.captureMessage("login_failed", {
    level: "warning",
    tags: { error_code: errorCode },
    extra: {
      cause: typeof message === "string" ? message : String(error),
      duration_ms: durationMs,
    },
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
  const inFlight = useRef(false);

  const signIn = async (connection?: string) => {
    // A second `authorize()` while the browser is still coming up hits the SDK's
    // transaction lock and surfaces as TRANSACTION_ACTIVE_ALREADY.
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSigningIn(true);

    const trackedConnection: LoginConnection = connection === "sms" ? "sms" : "default";
    const startedAt = Date.now();

    analytics.trackLoginStarted({ connection: trackedConnection });

    try {
      const result = await authorize({
        audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email offline_access",
        connection,
      });

      if (!result?.accessToken || !result?.refreshToken) {
        console.error("No access token received from Auth0");
        analytics.trackLoginFailed({
          connection: trackedConnection,
          reason: "no_tokens",
          errorCode: "NoTokensReturned",
          durationMs: Date.now() - startedAt,
        });
        showLoginFailureToast("NoTokensReturned");
        return;
      }

      // Tracked before the redirect so it lands on the same anonymous distinct_id as
      // `login_started`, keeping the whole funnel on one identity until `$identify`.
      analytics.trackLoginSucceeded({
        connection: trackedConnection,
        durationMs: Date.now() - startedAt,
      });

      // `authorize()` saved the credentials a moment ago, so the auth state is known.
      // Write it directly instead of invalidating the query and racing the `/(protected)`
      // guard, which would bounce the user through the sign-in screen first.
      queryClient.setQueryData(AUTH_QUERY_KEY, true);
      router.replace("/(protected)");

      // Non-critical write. It must not delay the redirect: the API timeout is 30s, and on a
      // slow connection that is 30s of staring at the sign-in screen after a successful login.
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      void updateUserProfile({ timezone }).catch((e: unknown) => {
        Sentry.captureException(e, { tags: { source: "post-login-timezone" } });
      });
    } catch (e) {
      console.error("Auth0 authorization error:", e);
      // This branch catches user cancellation as well as genuine errors — `reason` is
      // what tells them apart.
      const errorCode = toLoginErrorCode(e);
      const durationMs = Date.now() - startedAt;
      analytics.trackLoginFailed({
        connection: trackedConnection,
        reason: toLoginFailureReason(errorCode),
        errorCode,
        durationMs,
      });
      reportLoginFailure(e, errorCode, durationMs);
      showLoginFailureToast(errorCode);
    } finally {
      inFlight.current = false;
      setIsSigningIn(false);
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
