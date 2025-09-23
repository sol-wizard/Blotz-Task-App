import React from "react";
import { ColorValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type GradientColors = Readonly<[ColorValue, ColorValue, ...ColorValue[]]>;

type Props = {
  size?: number;
  colors?: GradientColors;
  onPress?: () => void;
  children?: React.ReactNode;
};

export function GradientCircle({
  size = 90,
  colors = ["#A3DC2F", "#2F80ED"] as const,
  children,
}: Props) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      {children}
    </LinearGradient>
  );
}
