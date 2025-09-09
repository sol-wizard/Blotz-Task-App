import React from "react";
import { View, StatusBar, Image } from "react-native";
import GetStartedButton from "@/feature/auth/components/get-started-button";

export default function OnboardingScreen() {

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

        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Image
            source={require("../../../assets/images/blotz-logo.png")}
            style={{ width: 240, height: 240 }}
            resizeMode="contain"
          />
        </View>

        <View
          style={{
            width: "100%",
            paddingBottom: 60,
          }}
        >
          <GetStartedButton />
        </View>
      </View>
    </>
  );
}
