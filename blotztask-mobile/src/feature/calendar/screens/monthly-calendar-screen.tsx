import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { format } from "date-fns";
import { theme } from "@/shared/constants/theme";
import { useMonthlyTasks } from "../hooks/useMonthlyTasks";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MonthlyDay, MonthlyDayProps } from "../components/monthly-day";

export default function MonthlyCalendarScreen() {
  const params = useLocalSearchParams<{ selectedDate: string }>();
  const initialSelectedDate =
    typeof params.selectedDate === "string" ? new Date(params.selectedDate) : new Date();
  const [selectedDay, setSelectedDay] = useState(initialSelectedDate);
  const selectedDate = format(selectedDay, "yyyy-MM-dd");
  const selectedMonthKey = format(selectedDay, "yyyy-MM");
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const shouldShowTodayButton = selectedDate !== todayDate;
  const { monthlyTaskAvailability } = useMonthlyTasks({ selectedDay });

  const thumbnailsByDate: Record<string, string[]> = {};

  monthlyTaskAvailability.forEach((item) => {
    const dateKey = format(new Date(item.date), "yyyy-MM-dd");
    thumbnailsByDate[dateKey] = item.taskThumbnails.map((thumbnail) => thumbnail.taskTitle);
  });

  const handleDayPress = useCallback((dateString: string) => {
    router.replace({ pathname: "/(protected)/(tabs)", params: { selectedDate: dateString } });
  }, []);

  const renderDay = useCallback(
    (props: MonthlyDayProps) => (
      <MonthlyDay
        {...props}
        selectedDate={selectedDate}
        titles={thumbnailsByDate[props.date?.dateString ?? ""] ?? []}
        onPressDay={handleDayPress}
      />
    ),
    [selectedDate, thumbnailsByDate, handleDayPress],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-5 pb-3">
        <View className="flex-row justify-center items-center mb-1">
          <Pressable
            onPress={() =>
              router.replace({ pathname: "/(protected)/(tabs)", params: { selectedDate } })
            }
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
        key={selectedMonthKey}
        current={selectedDate}
        onMonthChange={(month: DateData) => {
          const now = new Date();
          const isCurrentMonth = month.year === now.getFullYear() && month.month === now.getMonth() + 1;
          setSelectedDay(isCurrentMonth ? now : new Date(month.year, month.month - 1, 1));
        }}
        hideExtraDays
        firstDay={1}
        enableSwipeMonths
        dayComponent={renderDay}
        theme={{
          calendarBackground: theme.colors.background,
          textDayHeaderFontFamily: "BalooBold",
          textMonthFontFamily: "BalooBold",
          arrowColor: theme.colors.highlight,
        }}
      />
    </SafeAreaView>
  );
}
