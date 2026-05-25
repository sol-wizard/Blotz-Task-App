import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";

import GetStartedButton from "@/feature/auth/components/get-started-button";
import Animated, { FadeInDown } from "react-native-reanimated";
import MaskedView from "@expo/ui/community/masked-view";

export default function SigninScreen() {
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  return (
    <>
      <View
        style={{
          flex: 1,
          backgroundColor: "#ffffff",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <MaskedView
          style={{ width: "100%", height: SCREEN_HEIGHT * 0.7 }}
          maskElement={
            <View className="flex-1 flex-row justify-center items-center">
              {"Blotz".split("").map((letter, index) => (
                <Animated.Text
                  key={index}
                  className="font-balooExtraBold text-8xl py-6"
                  entering={FadeInDown.delay(index * 100)
                    .springify()
                    .mass(2)}
                >
                  {letter}
                </Animated.Text>
              ))}
            </View>
          }
        >
          <Animated.View
            style={[
              styles.linearBackground,
              {
                animationName: {
                  to: {
                    transform: [{ rotate: "360deg" }],
                  },
                },
                animationDuration: "3s",
                animationIterationCount: "infinite",
              },
            ]}
          />
        </MaskedView>

        <GetStartedButton />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  linearBackground: {
    experimental_backgroundImage:
      "linear-gradient(90deg,rgba(163, 220, 47, 1) 19%, rgba(87, 199, 133, 1) 50%, rgba(47, 128, 237, 1) 100%)",
    width: "100%",
    height: "100%",
  },
});
