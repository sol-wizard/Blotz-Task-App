import { theme } from "@/shared/constants/theme";
import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type CustomDayProps = {
  date?: {
    dateString: string;
    day: number;
    month: number;
    year: number;
    timestamp: number;
  };
  state?: "" | "selected" | "disabled" | "today" | "inactive";
  marking?: {
    marked?: boolean;
    dotColor?: string;
  };
  isMarked?: boolean;
  onPressDay?: (dateString: string) => void;
};

const weekNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CustomDay = ({ date, state, marking, isMarked, onPressDay }: CustomDayProps) => {
  const isToday = state === "today";
  const isSelected = state === "selected";
  const textColorClass = isSelected ? "text-white" : isToday ? "text-highlight" : "text-[#8C8C8C]";
  const hasMark = isMarked ?? marking?.marked ?? false;

  const progress = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected]);

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [theme.colors.background, theme.colors.highlight],
    ),
  }));
  if (!date) return null;
  const jsDay = new Date(date.dateString).getDay();
  const weekLabel = weekNames[jsDay];

  return (
    <Pressable onPress={() => onPressDay?.(date.dateString)} className="items-center bg-background">
      <Animated.View
        className={`w-2 h-2 mb-1 rounded-full ${hasMark ? "bg-highlight" : "bg-transparent"}`}
      />

      <Animated.View className="items-center p-2 w-[48px] rounded-2xl" style={backgroundStyle}>
        <Text className={`text-sm ${isToday && !isSelected && "font-bold"} ${textColorClass}`}>
          {weekLabel}
        </Text>
        <Text className={`text-[20px] font-bold mt-1 ${textColorClass}`}>{date.day}</Text>
      </Animated.View>
    </Pressable>
  );
};
