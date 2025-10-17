import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
import { SafeAreaView } from "react-native";
import { ToggleAiTaskGenerate } from "@/feature/ai-task-generate/toggle-ai-task-generate";
import { theme } from "@/shared/constants/theme";
import CalendarHeader from "../components/calendar-header";
import useSelectedDayTasks from "@/feature/calendar/hooks/useSelectedDayTasks";

import { FilteredTaskList } from "../components/filtered-task-list";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import { Snackbar } from "react-native-paper";

export default function CalendarScreen() {
  const { selectedDay, setSelectedDay } = useSelectedDayTasks();
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);

  const { deleteTaskSuccess } = useTaskMutations();

  return (
    <SafeAreaView className="flex-1">
      <CalendarHeader
        date={format(selectedDay, "yyyy-MM-dd")}
        isCalendarVisible={isCalendarVisible}
        onToggleCalendar={() => setIsCalendarVisible(!isCalendarVisible)}
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
            theme={{
              calendarBackground: "#F5F9FA",
              selectedDayBackgroundColor: "#EBF0FE",
              selectedDayTextColor: theme.colors.heading,
              dayTextColor: theme.colors.disabled,
              todayTextColor: theme.colors.disabled,
              textDayFontWeight: "bold",
              textDayFontFamily: "InterBold",
              textDayHeaderFontFamily: "InterThin",
              textDayFontSize: 16,
            }}
            markedDates={{
              [format(new Date(), "yyyy-MM-dd")]: { marked: true, dotColor: "#CDF79A" },
            }}
            allowShadow={false}
            firstDay={1}
          />
        )}

        <FilteredTaskList />
      </CalendarProvider>

      <ToggleAiTaskGenerate />

      <Snackbar visible={deleteTaskSuccess} onDismiss={() => {}} duration={2200}>
        Deleted task successfully!
      </Snackbar>
    </SafeAreaView>
  );
}
