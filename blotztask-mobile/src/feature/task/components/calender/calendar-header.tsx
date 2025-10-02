import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const formDate = (dateString: string) => {
  const dateObj = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set the time part to zero (hours, minutes, seconds, and milliseconds are all set to 0) for date comparison.

  const isToday = dateObj.getTime() === today.getTime();

  const month = dateObj.toLocaleString("default", { month: "short" });
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

  return {
    dayOfWeek: isToday ? "Today" : `${day} ${month}`,
    monthDay: `${month} ${day}`,
    year: year.toString(),
  };
};

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
  const { dayOfWeek, monthDay, year } = formDate(date);

  return (
    <View className="flex-row justify-between items-center px-5">
      <View className="flex-row items-center gap-3">
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
      <View>
        <Text className="text-lg font-bold text-gray-600 text-right">{monthDay}</Text>
        <Text className="text-xl font-bold text-gray-600">{year}</Text>
      </View>
    </View>
  );
}
