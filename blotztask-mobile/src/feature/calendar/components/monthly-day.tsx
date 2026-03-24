import { Pressable, Text, View } from "react-native";

export type MonthlyDayProps = {
  date?: {
    dateString: string;
    day: number;
  };
  state?: "" | "selected" | "disabled" | "today" | "inactive";
  selectedDate?: string;
  titles?: string[];
  onPressDay?: (dateString: string) => void;
};

export const MonthlyDay = ({ date, state, selectedDate, titles = [], onPressDay }: MonthlyDayProps) => {
  if (!date) return null;

  const dayKey = date.dateString;
  const isSelected = dayKey === selectedDate;
  const isToday = state === "today";
  const isInactive = state === "disabled" || state === "inactive";
  const visibleTitles = titles.slice(0, 3);

  return (
    <Pressable
      onPress={() => onPressDay?.(dayKey)}
      className="px-1 py-1 min-h-[66px]"
    >
      <View
        className={`w-7 h-7 rounded-full items-center justify-center mb-1 ${isSelected ? "bg-highlight" : "bg-transparent"}`}
      >
        <Text
          className={`text-xs font-bold ${isSelected ? "text-white" : isInactive ? "text-gray-300" : isToday ? "text-highlight" : "text-gray-800"}`}
        >
          {date.day}
        </Text>
      </View>

      {visibleTitles.map((title, index) => (
        <Text
          key={`${dayKey}-${index}`}
          numberOfLines={1}
          ellipsizeMode="tail"
          className="text-[9px] leading-[11px] text-gray-600"
        >
          {title}
        </Text>
      ))}
    </Pressable>
  );
};
