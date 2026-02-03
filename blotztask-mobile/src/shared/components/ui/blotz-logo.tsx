import React from "react";
import { View, Text } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

interface BlotzLogoProps {
  fontSize?: number;
}

export function BlotzLogo({ fontSize = 20 }: BlotzLogoProps) {
  return (
    <View style={{ height: fontSize * 1.5, width: fontSize * 3.5 }}>
      <MaskedView
        style={{ flex: 1 }}
        maskElement={
          <View className="flex-1 flex-row justify-center items-center bg-transparent">
            <Text
              style={{ fontSize, lineHeight: fontSize * 1.2 }}
              className="font-balooExtraBold text-center"
            >
              Blotz
            </Text>
          </View>
        }
      >
        <LinearGradient
          colors={["rgba(163, 220, 47, 1)", "rgba(87, 199, 133, 1)", "rgba(47, 128, 237, 1)"]}
          locations={[0.19, 0.5, 1.0]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </MaskedView>
    </View>
  );
}
