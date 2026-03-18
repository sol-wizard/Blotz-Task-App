import { Pressable, Text, View } from "react-native";

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
  if (!date) return null;

  const jsDay = new Date(date.dateString).getDay();
  const weekLabel = weekNames[jsDay];

  const isToday = state === "today";
  const isSelected = state === "selected";
  const textColorClass = isSelected ? "text-white" : isToday ? "text-black" : "text-[#8C8C8C]";
  const hasMark = isMarked ?? marking?.marked ?? false;

  return (
    <Pressable
      onPress={() => onPressDay?.(date.dateString)}
      className={`items-center bg-background `}
    >
      <View
        className={`w-2 h-2 mb-1 rounded-full ${hasMark ? "bg-highlight" : "bg-transparent"}`}
      />

      <View className={`items-center p-2 w-12 ${isSelected && " bg-highlight rounded-2xl"}`}>
        <Text className={`text-sm ${isToday && !isSelected && "font-bold"} ${textColorClass}`}>
          {weekLabel}
        </Text>
        <Text className={`text-xl font-bold mt-1 ${textColorClass}`}>{date.day}</Text>
      </View>
    </Pressable>
  );
};
