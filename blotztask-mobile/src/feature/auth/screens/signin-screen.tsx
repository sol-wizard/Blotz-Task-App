import React from "react";
import { View, StatusBar } from "react-native";
import GetStartedButton from "@/feature/auth/components/get-started-button";
import { ASSETS } from "@/shared/constants/assets";
import { Image } from "expo-image";

export default function SigninScreen() {
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
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Image
            source={ASSETS.blotzLogo}
            style={{ width: 240, height: 240 }}
            contentFit="contain"
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
