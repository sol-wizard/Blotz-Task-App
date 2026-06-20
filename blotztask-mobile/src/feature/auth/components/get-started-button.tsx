import React from "react";
import { useAuth0 } from "react-native-auth0";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/shared/hooks/useAuth";
import { updateUserProfile } from "@/shared/services/user-service";
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
    try {
      const result = await authorize({
        audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email offline_access",
        connection,
      });

      if (!result?.accessToken || !result?.refreshToken) {
        console.error("No access token received from Auth0");
        return;
      }

      // No manual token storage: `authorize()` already saved credentials to the
      // Auth0 SDK credentials manager, which is the single source of truth.

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
