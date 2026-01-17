import React from "react";
import { Button } from "react-native-paper";
import { useAuth0 } from "react-native-auth0";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/constants/token-key";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";

export default function GetStartedButton() {
  const { authorize, user } = useAuth0();
  const router = useRouter();
  const posthog = usePostHog();
  const { i18n, t } = useTranslation("common");

  const onPress = async () => {
    try {
      const language = i18n.language?.startsWith("zh") ? "zh-CN" : "en";

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
    <Button onPress={onPress} mode="contained">
      {t("buttons.getStarted")}
    </Button>
  );
}
