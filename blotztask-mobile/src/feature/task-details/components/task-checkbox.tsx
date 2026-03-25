import React, { useEffect } from "react";
import { Pressable, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "@/shared/constants/theme";
import * as Haptics from "expo-haptics";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void | Promise<void>;
  disabled?: boolean;
  size?: number;
  color?: string;
  uncheckedColor?: string;
  className?: string;
  style?: ViewStyle;
};

const GREEN = theme.colors.checked;
const GRAY = theme.colors.disabled;

export default function TasksCheckbox({
  checked,
  onChange,
  disabled = false,
  size = 22,
  color = GREEN,
  uncheckedColor = GRAY,
  className = "",
  style,
}: Props) {
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 200 });
  }, [checked]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ["#FFFFFF", color]),
  }));

  const handlePress = async () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onChange(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={["items-center justify-center overflow-hidden", disabled ? "opacity-50" : "", className].join(" ")}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: checked ? color : uncheckedColor,
          backgroundColor: "#FFFFFF",
        },
        style,
      ]}
    >
      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, bgStyle]} />
      {checked && <MaterialIcons name="check" size={Math.round(size * 0.6)} color="#FFFFFF" />}
    </Pressable>
  );
}
