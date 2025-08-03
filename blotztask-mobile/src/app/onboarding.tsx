import React from "react";
import { View, StatusBar, Image } from "react-native";
import { Button } from "react-native-paper";
import { useRouter } from "expo-router";

export default function OnboardingScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.replace("/(auth)/login");
  };

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
          {/* Logo/Brand */}
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Image
              source={require("../../assets/images/blotz-logo.png")}
              style={{
                width: 200,
                height: 200,
                resizeMode: "contain",
              }}
            />
          </View>

          {/* Get Started Button */}
          <View
            style={{
              width: "100%",
              paddingBottom: 60,
            }}
          >
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
          </View>
        </View>
    </>
  );
}