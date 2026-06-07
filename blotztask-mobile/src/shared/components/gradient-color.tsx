import type { ReactElement } from "react";
import MaskedView from "@expo/ui/community/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

interface GradientColorProps {
  children: ReactElement;
  className?: string;
}

export function GradientColor({ children, className }: GradientColorProps) {
  return (
    <View className={className}>
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
          colors={["rgba(163, 220, 47, 1)", "rgba(87, 199, 133, 1)", "rgba(47, 128, 237, 1)"]}
          locations={[0.19, 0.5, 1.0]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
