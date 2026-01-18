import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
import { theme } from "@/shared/constants/theme";
import CalendarHeader from "../components/calendar-header";
import { FilteredTaskList } from "../components/filtered-task-list";
import { useTaskDays } from "../hooks/useTaskDays";
import { getMarkedDates, getSelectedDates } from "../util/get-marked-dates";
import { usePushNotificationSetup } from "@/shared/hooks/usePushNotificationSetup";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSharedValue, withTiming } from "react-native-reanimated";

// Define the theme object outside the component to prevent re-renders
const calendarTheme = {
  calendarBackground: theme.colors.background,
  selectedDayBackgroundColor: "#EBF0FE",
  selectedDayTextColor: "#333333",
  todayTextColor: "#000000",
  textDayFontWeight: "bold" as const,
  dayTextColor: theme.colors.disabled,
  textDayFontFamily: "InterBold",
  textDayHeaderFontFamily: "InterThin",
  textDayFontSize: 16,
};

export default function CalendarScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const { weeklyTaskAvailability, isLoading } = useTaskDays({ selectedDay });
  const progress = useSharedValue(isCalendarVisible ? 1 : 0);
  usePushNotificationSetup();
  useLanguageInit(); // Initialize language from backend

  let markedDates;
  if (!isLoading) {
    markedDates = getMarkedDates({ selectedDay, weeklyTaskAvailability });
  } else {
    markedDates = getSelectedDates({ selectedDay });
  }

  return (
    <SafeAreaView className="flex-1" edges={["top"]}>
      <CalendarHeader
        date={format(selectedDay, "yyyy-MM-dd")}
        progress={progress}
        onToggleCalendar={() => {
          const next = !isCalendarVisible;
          setIsCalendarVisible(next);
          progress.value = withTiming(next ? 1 : 0, { duration: 220 });
        }}
      />
      <CalendarProvider
        date={format(selectedDay, "yyyy-MM-dd")}
        onDateChanged={(date: string) => setSelectedDay(new Date(date))}
        showTodayButton={false}
      >
        {isCalendarVisible && (
          <WeekCalendar
            onDayPress={(day: DateData) => setSelectedDay(new Date(day.dateString))}
            current={format(selectedDay, "yyyy-MM-dd")}
            theme={calendarTheme}
            markedDates={markedDates}
            allowShadow={false}
            firstDay={1}
          />
        )}

        <FilteredTaskList selectedDay={selectedDay} />
      </CalendarProvider>
    </SafeAreaView>
  );
}
