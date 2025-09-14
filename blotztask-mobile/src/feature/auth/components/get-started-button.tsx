import React from "react";
import { Button } from "react-native-paper";
import { useAuth0 } from "react-native-auth0";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";

export default function GetStartedButton() {
  const { authorize } = useAuth0();
  const router = useRouter();

  const onPress = async () => {
    try {
      const result = await authorize({
        audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
      });

      // Check if we have a valid result with access token
      if (result && result.accessToken) {
        // Save the access token to secure storage
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.accessToken);
        console.log("Access token saved to storage");

        // Redirect to protected page
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
      Get Started
    </Button>
  );
}
