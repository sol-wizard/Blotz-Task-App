import type { ReactElement } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import MaskedView from "@expo/ui/community/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import type { LinearGradientProps } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

const DEFAULT_GRADIENT_COLORS: LinearGradientProps["colors"] = [
  "rgba(163, 220, 47, 1)",
  "rgba(87, 199, 133, 1)",
  "rgba(47, 128, 237, 1)",
];

const DEFAULT_GRADIENT_LOCATIONS: NonNullable<LinearGradientProps["locations"]> = [0.19, 0.5, 1.0];

interface GradientShaderProps {
  children: ReactElement;
  colors?: LinearGradientProps["colors"];
  locations?: LinearGradientProps["locations"];
  start?: LinearGradientProps["start"];
  end?: LinearGradientProps["end"];
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function GradientShader({
  children,
  colors = DEFAULT_GRADIENT_COLORS,
  locations = DEFAULT_GRADIENT_LOCATIONS,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  className,
  style,
}: GradientShaderProps) {
  return (
    <View className={className} style={style}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.layoutContent}
      >
        {children}
      </View>

      <MaskedView
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        maskElement={<View style={styles.maskContent}>{children}</View>}
      >
        <LinearGradient
          colors={colors}
          locations={locations}
          start={start}
          end={end}
          style={StyleSheet.absoluteFill}
        />
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  layoutContent: {
    opacity: 0,
  },
  maskContent: {
    flex: 1,
  },
});
