import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const TaskStatusButton = ({
  isSelected,
  onChange,
  statusName,
  taskCount,
}: {
  isSelected: boolean;
  onChange: () => void;
  statusName: string;
  taskCount: number;
}) => {
  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isSelected ? 1 : 0, { duration: 250 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ["#e5e7eb", "#000000"]),
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], ["#4b5563", "#ffffff"]),
  }));

  return (
    <AnimatedPressable
      onPress={onChange}
      className="px-4 py-2 rounded-3xl"
      style={animatedStyle}
    >
      <Animated.Text
        className={`font-inter ${isSelected ? "font-bold" : ""}`}
        style={animatedTextStyle}
        numberOfLines={1}
      >
        {statusName} ({taskCount})
      </Animated.Text>
    </AnimatedPressable>
  );
};
