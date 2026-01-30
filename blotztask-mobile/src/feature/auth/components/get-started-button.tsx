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

export default function GetStartedButton() {
  const { authorize, user } = useAuth0();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation("common");
  const { refreshAuthState } = useAuth();

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
    <Pressable onPress={onPress}>
      <Text>{t("buttons.getStarted")}</Text>
    </Pressable>
  );
}
