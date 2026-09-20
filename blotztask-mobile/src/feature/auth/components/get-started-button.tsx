import React, { useRef, useState } from "react";
import { useAuth0 } from "react-native-auth0";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/shared/hooks/useAuth";
import { updateUserProfile } from "@/shared/services/user-service";
import { analytics } from "@/shared/services/analytics";
import { toLoginErrorCode, toLoginFailureReason } from "@/feature/auth/utils/login-error-code";
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
  // The ref is the guard: two taps in one frame would both pass a state check.
  const signingInRef = useRef(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signIn = async () => {
    // A second authorize() while one is open throws TRANSACTION_ACTIVE_ALREADY.
    if (signingInRef.current) return;
    signingInRef.current = true;
    setIsSigningIn(true);

    const startedAt = Date.now();

    analytics.trackLoginStarted({ connection: "default" });

    try {
      // ephemeralSession skips the iOS "Wants to Use auth0.com to Sign In" alert, where most
      // cancelled logins happen. The cost is no shared Safari cookies. iOS only.
      const result = await authorize(
        {
          audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
          scope: "openid profile email offline_access",
        },
        { ephemeralSession: true },
      );

      if (!result?.accessToken || !result?.refreshToken) {
        console.error("No access token received from Auth0");
        analytics.trackLoginFailed({
          connection: "default",
          reason: "no_tokens",
          errorCode: "NoTokensReturned",
          durationMs: Date.now() - startedAt,
        });
        return;
      }

      // Tracked before the redirect so it lands on the same anonymous distinct_id as
      // `login_started`, keeping the whole funnel on one identity until `$identify`.
      analytics.trackLoginSucceeded({
        connection: "default",
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
        connection: "default",
        reason: toLoginFailureReason(errorCode),
        errorCode,
        durationMs: Date.now() - startedAt,
      });
    } finally {
      signingInRef.current = false;
      setIsSigningIn(false);
    }
  };

  return (
    <View style={{ gap: 12, width: "100%" }}>
      <PillButton
        label={t("buttons.continue")}
        onPress={signIn}
        variant="primary"
        disabled={isSigningIn}
      />
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
          opacity: disabled ? 0.5 : 1,
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
