import UserProfile from "./user-profile";
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
  const { dayOfWeek } = formatCalendarDate(date);

  return (
    <View className="flex-row items-center justify-between px-5">
      <View className="flex-row items-center gap-3">
        <Text className="text-5xl font-bold text-gray-800 font-balooExtraBold items-end pt-10">
          {dayOfWeek}
        </Text>

        <TouchableOpacity onPress={onToggleCalendar} className="pt-5" activeOpacity={0.7}>
          <Ionicons
            name={isCalendarVisible ? "chevron-up" : "chevron-down"}
            size={22}
            className="text-gray-800"
            style={{
              fontWeight: "800",
              textShadowColor: "#1F2937",
              textShadowOffset: { width: 0.7, height: 0.7 },
              textShadowRadius: 0.7,
            }}
          />
        </TouchableOpacity>
      </View>

      <UserProfile />
    </View>
  );
}
