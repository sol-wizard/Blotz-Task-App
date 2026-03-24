import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { format } from "date-fns";
import { theme } from "@/shared/constants/theme";
import { useMonthlyTasks } from "../hooks/useMonthlyTasks";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type MonthlyDayProps = {
  date?: {
    dateString: string;
    day: number;
    month: number;
    year: number;
    timestamp: number;
  };
  state?: "" | "selected" | "disabled" | "today" | "inactive";
};

export default function MonthlyCalendarScreen() {
  const params = useLocalSearchParams<{ selectedDate?: string | string[] }>();
  const initialSelectedDate =
    typeof params.selectedDate === "string" ? new Date(params.selectedDate) : new Date();
  const [selectedDay, setSelectedDay] = useState(initialSelectedDate);
  const selectedDate = format(selectedDay, "yyyy-MM-dd");
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const shouldShowTodayButton = selectedDate !== todayDate;
  const { monthlyTaskAvailability } = useMonthlyTasks({ selectedDay });

  const thumbnailsByDate = useMemo(() => {
    const result: Record<string, string[]> = {};

    monthlyTaskAvailability.forEach((item) => {
      const dateKey = format(new Date(item.date), "yyyy-MM-dd");
      result[dateKey] = item.taskThumbnails.map((thumbnail) => thumbnail.taskTitle);
    });

    return result;
  }, [monthlyTaskAvailability]);

  const renderDay = useCallback(
    ({ date, state }: MonthlyDayProps) => {
      if (!date) return null;

      const dayKey = date.dateString;
      const isSelected = dayKey === selectedDate;
      const isToday = state === "today";
      const isInactive = state === "disabled" || state === "inactive";
      const titles = thumbnailsByDate[dayKey] ?? [];
      const visibleTitles = titles.slice(0, 3);

      return (
        <Pressable
          onPress={() => {
            router.replace(`/(protected)/(tabs)?selectedDate=${dayKey}`);
          }}
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
    },
    [selectedDate, thumbnailsByDate],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pb-3">
        <View className="flex-row justify-center items-center mb-1">
          <Pressable
            onPress={() => router.replace(`/(protected)/(tabs)?selectedDate=${selectedDate}`)}
            className="mr-2 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#1F2937" />
          </Pressable>
          <Text className="text-3xl font-balooExtraBold text-gray-800">Monthly Calendar</Text>
        </View>
        {shouldShowTodayButton && (
          <View className="items-end">
            <Pressable
              onPress={() => setSelectedDay(new Date())}
              className="px-3 py-1 rounded-full border border-highlight"
            >
              <Text className="text-sm font-balooBold text-highlight">Today</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Calendar
        current={selectedDate}
        onDayPress={(day: DateData) => {
          setSelectedDay(new Date(day.dateString));
        }}
        onMonthChange={(month: DateData) => {
          setSelectedDay(new Date(month.dateString));
        }}
        hideExtraDays
        firstDay={1}
        enableSwipeMonths
        dayComponent={renderDay}
        theme={{
          calendarBackground: theme.colors.background,
          textDayFontFamily: "BalooBold",
          textDayHeaderFontFamily: "BalooBold",
          textMonthFontFamily: "BalooBold",
          todayTextColor: theme.colors.highlight,
          arrowColor: theme.colors.highlight,
          dayTextColor: "#333",
          textDisabledColor: "#bbb",
        }}
      />
    </SafeAreaView>
  );
}
