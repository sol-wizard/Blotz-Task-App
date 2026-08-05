import React from "react";
import { useAuth0 } from "react-native-auth0";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/shared/hooks/useAuth";
import { updateUserProfile } from "@/shared/services/user-service";
import { analytics } from "@/shared/services/analytics";
import { toLoginErrorCode, toLoginFailureReason } from "@/feature/auth/utils/login-error-code";
import type { LoginConnection } from "@/shared/constants/posthog-events";
import { Pressable, Text, View } from "react-native";
import {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = createAnimatedComponent(Pressable);

export default function GetStartedButton() {
  const { authorize } = useAuth0();
  const router = useRouter();
  const { t } = useTranslation("common");
  const { refreshAuthState } = useAuth();

  const signIn = async (connection?: string) => {
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
        return;
      }

      // Tracked before the redirect so it lands on the same anonymous distinct_id as
      // `login_started`, keeping the whole funnel on one identity until `$identify`.
      analytics.trackLoginSucceeded({
        connection: trackedConnection,
        durationMs: Date.now() - startedAt,
      });

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await updateUserProfile({ timezone });
      } catch (e) {
        console.error("Timezone sync failed:", e);
      }

      refreshAuthState();
      router.replace("/(protected)");
    } catch (e) {
      console.error("Auth0 authorization error:", e);
      // This branch catches user cancellation as well as genuine errors — `reason` is
      // what tells them apart.
      const errorCode = toLoginErrorCode(e);
      analytics.trackLoginFailed({
        connection: trackedConnection,
        reason: toLoginFailureReason(errorCode),
        errorCode,
        durationMs: Date.now() - startedAt,
      });
    }
  };

  const showPhone = process.env.EXPO_PUBLIC_APP_ENV !== "production";

  return (
    <View style={{ gap: 12, width: "100%" }}>
      <PillButton label={t("buttons.continue")} onPress={() => signIn()} variant="primary" />
      {showPhone && (
        <PillButton
          label={t("buttons.continueWithPhone")}
          onPress={() => signIn("sms")}
          variant="secondary"
        />
      )}
    </View>
  );
}

function PillButton({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
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
