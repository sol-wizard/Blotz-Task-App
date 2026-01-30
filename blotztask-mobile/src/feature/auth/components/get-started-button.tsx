import React from "react";
import { useAuth0 } from "react-native-auth0";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/constants/token-key";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/shared/hooks/useAuth";
import { systemPreferredLanguage } from "../utils/system-preferred-language";
import { Pressable, Text } from "react-native";
import {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function GetStartedButton() {
  const { authorize, user } = useAuth0();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation("common");
  const { refreshAuthState } = useAuth();
  const AnimatedPressable = createAnimatedComponent(Pressable);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPress = async () => {
    try {
      const language = systemPreferredLanguage?.startsWith("zh") ? "zh-CN" : "en";

      const result = await authorize({
        audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
        scope: "openid profile email offline_access",
        additionalParameters: {
          ui_locales: language,
        },
      });

      // Check if we have a valid result with access token
      if (result && result.accessToken && result.refreshToken) {
        // Save the access token to secure storage
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.accessToken);
        console.log("Access token saved to storage");
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken);
        console.log("Refresh token saved to storage");

        // Refresh auth state cache so dependent queries can start
        refreshAuthState();

        if (user) {
          posthog.identify(user.sub);
        }

        router.replace("/(protected)");
      } else {
        console.error("No access token received from Auth0");
      }
    } catch (e) {
      console.error("Auth0 authorization error:", e);
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(1.08, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={animatedStyle}
    >
      <Text
        className="font-balooBold text-lg py-3 px-10 bg-black text-white rounded-full"
        style={{
          borderCurve: "continuous",
          textAlign: "center",
          letterSpacing: 0.3,
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.18)",
        }}
      >
        {t("buttons.getStarted")}
      </Text>
    </AnimatedPressable>
  );
}
