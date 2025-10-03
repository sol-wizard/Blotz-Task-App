import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCalendarDate } from "@/feature/calendar/util/date-formatter";

interface CalendarHeaderProps {
  date: string;
  isCalendarVisible: boolean;
  onToggleCalendar: () => void;
}

export default function CalendarHeader({
  date,
  isCalendarVisible,
  onToggleCalendar,
}: CalendarHeaderProps) {
  const { dayOfWeek, monthDay, year } = formatCalendarDate(date);

  return (
    <View className="flex-row items-center gap-3 px-5">
      <Text className="text-5xl font-bold text-gray-800 font-balooExtraBold items-end pt-10">
        {dayOfWeek}
      </Text>
      <TouchableOpacity onPress={onToggleCalendar} className="pt-5" activeOpacity={0.7}>
        <Ionicons
          name={isCalendarVisible ? "chevron-up" : "chevron-down"}
          size={34}
          className="text-gray-800"
        />
      </TouchableOpacity>
    </View>
  );
}
