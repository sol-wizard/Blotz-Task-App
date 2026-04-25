import { View, Text, Pressable } from "react-native";
import { formatCalendarDate } from "@/feature/calendar/util/date-formatter";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { AnimatedChevron } from "@/shared/components/chevron";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { SharedValue } from "react-native-reanimated";

interface CalendarHeaderProps {
  date: string;
  progress: SharedValue<number>;
  onToggleCalendar: () => void;
}

export default function CalendarHeader({ date, progress, onToggleCalendar }: CalendarHeaderProps) {
  const { userPreferences } = useUserPreferencesQuery();
  const { dayOfWeek } = formatCalendarDate(date, userPreferences);

  return (
    <View className="flex-row items-center justify-between px-5">
      <View className="flex-row items-center gap-3">
        <Text className="text-5xl text-gray-800 font-balooExtraBold items-end pt-10">
          {dayOfWeek}
        </Text>

        <Pressable
          onPress={onToggleCalendar}
          className="ml-2 p-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <AnimatedChevron color="#1F2937" progress={progress} />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-end gap-3">
        <Pressable
          onPress={() => {
            router.push({
              pathname: "/(protected)/ddl",
            });
          }}
          className="h-14 w-14 items-center justify-center rounded-full bg-white border border-gray-100"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="flag" size={24} color="#1F2937" />
        </Pressable>

        <Pressable
          onPress={() => {
            router.push({
              pathname: "/(protected)/monthly-calendar",
              params: { selectedDate: date },
            });
          }}
          className="h-14 w-14 items-center justify-center rounded-full bg-white border border-gray-100"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="calendar-check" size={24} color="#1F2937" />
        </Pressable>
      </View>
    </View>
  );
}
