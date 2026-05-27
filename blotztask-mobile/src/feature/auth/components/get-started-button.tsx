import React from "react";
import { useAuth0 } from "react-native-auth0";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/constants/token-key";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/shared/hooks/useAuth";
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

      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken);

      refreshAuthState();
      router.replace("/(protected)");
    } catch (e) {
      console.error("Auth0 authorization error:", e);
    }
  };

  const showPhone = process.env.EXPO_PUBLIC_APP_ENV !== "production";

  return (
    <View style={{ gap: 12 }}>
      <PillButton label={t("buttons.continue")} onPress={() => signIn()} />
      {showPhone && (
        <PillButton label={t("buttons.continueWithPhone")} onPress={() => signIn("sms")} />
      )}
    </View>
  );
}

function PillButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
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
        {label}
      </Text>
    </AnimatedPressable>
  );
}
