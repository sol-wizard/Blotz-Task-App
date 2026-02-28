import { View, Text, Pressable } from "react-native";
import { formatCalendarDate } from "@/feature/calendar/util/date-formatter";
import { AnimatedChevron } from "@/shared/components/ui/chevron";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface CalendarHeaderProps {
  date: string;
  progress: any;
  onToggleCalendar: () => void;
}

export default function CalendarHeader({ date, progress, onToggleCalendar }: CalendarHeaderProps) {
  const { dayOfWeek } = formatCalendarDate(date);

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

      <View className="flex-row items-center justify-end px-5">
        <Pressable
          onPress={() => {
            router.push({
              pathname: "/(protected)/ddl",
            });
          }}
        >
          <MaterialCommunityIcons name="bell-outline" size={24} color="black" />
        </Pressable>
      </View>
    </View>
  );
}
