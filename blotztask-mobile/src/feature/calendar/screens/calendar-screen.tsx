import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarProvider, WeekCalendar } from "react-native-calendars";
import { theme } from "@/shared/constants/theme";
import CalendarHeader from "../components/calendar-header";
import { FilteredTaskList } from "../components/filtered-task-list";
import { useTaskDays } from "../hooks/useTaskDays";
import { getMarkedDates, getSelectedDates } from "../util/get-marked-dates";
import { usePushNotificationSetup } from "@/shared/hooks/usePushNotificationSetup";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { AppState } from "react-native";
import { ExtensionStorage } from "@bacons/apple-targets";
import { TASK_STORAGE_KEY, widgetStorage, WidgetTask } from "@/shared/constants/widget-storage";
import useSelectedDayTasks from "@/shared/hooks/useSelectedDayTasks";

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
  const { selectedDayTasks: todayTasks } = useSelectedDayTasks({ selectedDay: new Date() });
  const progress = useSharedValue(isCalendarVisible ? 1 : 0);
  usePushNotificationSetup();

  let markedDates;
  if (!isLoading) {
    markedDates = getMarkedDates({ selectedDay, weeklyTaskAvailability });
  } else {
    markedDates = getSelectedDates({ selectedDay });
  }

  useEffect(() => {
    AppState.addEventListener("change", (status) => {
      if (status === "background") {
        const widgetTodayTasks: WidgetTask[] = todayTasks.map((task) => ({
          id: String(task.id),
          title: task.title,
          isDone: task.isDone ? "true" : "false",
        }));
        console.log("Preparing to update widget today tasks:", todayTasks);
        widgetStorage.set(TASK_STORAGE_KEY, widgetTodayTasks);
        console.log("Widget today tasks updated:", widgetTodayTasks);
        ExtensionStorage.reloadWidget();
        console.log("App moved to background, reloading widget storage.");
      }
    });
  }, [todayTasks]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
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
        onDateChanged={(date: string) => {
          setSelectedDay(new Date(date));
        }}
        showTodayButton={false}
      >
        {isCalendarVisible && (
          <Animated.View
            entering={MotionAnimations.upEntering}
            exiting={MotionAnimations.outExiting}
          >
            <WeekCalendar
              theme={calendarTheme}
              markedDates={markedDates}
              allowShadow={false}
              firstDay={1}
            />
          </Animated.View>
        )}

        <FilteredTaskList selectedDay={selectedDay} />
      </CalendarProvider>
    </SafeAreaView>
  );
}
