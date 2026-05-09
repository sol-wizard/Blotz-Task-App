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
  type: "task" | "subtask";
  checked: boolean;
  onChange: (next: boolean) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
};

const TASK_SIZE = 22;
const SUBTASK_SIZE = 20;
const GREEN = theme.colors.checked;
const GRAY = theme.colors.disabled;

export default function TasksCheckbox({
  type,
  checked,
  onChange,
  disabled = false,
  className = "",
  style,
}: Props) {
  const isTask = type === "task";
  const size = isTask ? TASK_SIZE : SUBTASK_SIZE;

  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 200 });
  }, [checked]);

  // Task: bg animates white → green. Subtask: bg always transparent.
  const filledBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ["#FFFFFF", GREEN]),
  }));

  const handlePress = async () => {
    if (disabled) return;
    if (!checked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await onChange(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={[
        "items-center justify-center overflow-hidden",
        disabled ? "opacity-50" : "",
        className,
      ].join(" ")}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: checked ? GREEN : GRAY,
          backgroundColor: "transparent",
        },
        style,
      ]}
    >
      {isTask && (
        <Animated.View
          style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, filledBgStyle]}
        />
      )}
      {checked && (
        <MaterialIcons
          name="check"
          size={Math.round(size * 0.6)}
          color={isTask ? "#FFFFFF" : GREEN}
        />
      )}
    </Pressable>
  );
}
