import React from "react";
<<<<<<< HEAD
import { View, StatusBar, Image } from "react-native";
import GetStartedButton from "@/feature/auth/components/get-started-button";

export default function OnboardingScreen() {
=======
import { View, StatusBar } from "react-native";
import { Button } from "react-native-paper";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";

export default function OnboardingScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.replace("/(auth)/login");
  };
>>>>>>> 6eb4676 (Frontend refactor (#467))

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
<<<<<<< HEAD

        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Image
            source={require("../../../assets/images/blotz-logo.png")}
            style={{ width: 240, height: 240 }}
            resizeMode="contain"
          />
        </View>

=======
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
>>>>>>> 6eb4676 (Frontend refactor (#467))
        <View
          style={{
            width: "100%",
            paddingBottom: 60,
          }}
        >
<<<<<<< HEAD
          <GetStartedButton />
=======
          <Button
            mode="contained"
            onPress={handleGetStarted}
            style={{
              borderRadius: 12,
              paddingVertical: 12,
              backgroundColor: "#E5E7EB",
            }}
            labelStyle={{
              fontSize: 16,
              fontWeight: "500",
              color: "#374151",
              letterSpacing: 0.3,
            }}
            contentStyle={{
              paddingVertical: 12,
            }}
          >
            Let&apos;s Go!
          </Button>
>>>>>>> 6eb4676 (Frontend refactor (#467))
        </View>
      </View>
    </>
  );
}
