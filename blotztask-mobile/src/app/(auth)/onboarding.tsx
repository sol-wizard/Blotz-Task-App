import React from "react";
import { View, StatusBar } from "react-native";
import { Button } from "react-native-paper";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useAuth0 } from "react-native-auth0";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";

export default function OnboardingScreen() {
  const router = useRouter();

  const LoginButton = () => {
    const {authorize} = useAuth0();
    const onPress = async () => {  
      try {
          const result = await authorize({
            audience: "https://blotz-task-dev/api",
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
    
    return <Button onPress={onPress} mode="contained">Log in with Auth0</Button>
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        {/* Onboarding Animation */}
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <LottieView
            source={require("../../../assets/images/onboarding.json")}
            autoPlay
            loop
            style={{ width: 240, height: 240 }}
          />
        </View>

        {/* Get Started Button */}
        <View
          style={{
            width: "100%",
            paddingBottom: 60,
          }}
        >
          <LoginButton />
        </View>
      </View>
    </>
  );
}
