import React, { useState } from "react";
import { View } from "react-native";
import { format } from "date-fns";
import { CalendarProvider, WeekCalendar } from "react-native-calendars";
import { theme } from "@/shared/constants/theme";
import TasksHeader, { SectionType } from "../components/header";
import { FilteredTaskList } from "../components/filtered-task-list";
import { useTaskDays } from "../hooks/useTaskDays";
import { getMarkedDates, getSelectedDates } from "../util/get-marked-dates";
import { usePushNotificationSetup } from "@/shared/hooks/usePushNotificationSetup";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { ReminderSection } from "../components/reminder-section";
import { DeadlineSection } from "../components/deadline-section";

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

export default function TasksScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [isCalendarVisible] = useState(true);
  const [selectedSection, setSelectedSection] = useState<SectionType>("Today");
  const { weeklyTaskAvailability, isLoading } = useTaskDays({ selectedDay });
  usePushNotificationSetup();

  let markedDates;
  if (!isLoading) {
    markedDates = getMarkedDates({ selectedDay, weeklyTaskAvailability });
  } else {
    markedDates = getSelectedDates({ selectedDay });
  }

  const handleSectionChange = (section: SectionType) => {
    setSelectedSection(section);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <TasksHeader selectedSection={selectedSection} onSectionChange={handleSectionChange} />
      {selectedSection === "Today" && (
        <View className="flex-1">
          <FilteredTaskList selectedDay={selectedDay} />
        </View>
      )}

      {selectedSection === "Reminder" && (
        <View className="flex-1">
          <ReminderSection />
        </View>
      )}

      {selectedSection === "DDL" && (
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

          <View className="flex-1">
            <DeadlineSection />
          </View>
        </CalendarProvider>
      )}
    </SafeAreaView>
  );
}
