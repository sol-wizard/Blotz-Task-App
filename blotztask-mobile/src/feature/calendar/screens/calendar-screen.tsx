import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarProvider, DateData, WeekCalendar } from "react-native-calendars";
import { SafeAreaView } from "react-native";

import { theme } from "@/shared/constants/theme";
import CalendarHeader from "../components/calendar-header";
import { FilteredTaskList } from "../components/filtered-task-list";
import { useTaskDays } from "../hooks/useTaskDays";
import { getMarkedDates, getSelectedDates } from "../util/get-marked-dates";

export default function CalendarScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const { weeklyTaskAvability, isLoading } = useTaskDays({ selectedDay });
  let markedDates;
  if (!isLoading) {
    markedDates = getMarkedDates({ selectedDay, weeklyTaskAvability });
  } else {
    markedDates = getSelectedDates({ selectedDay });
  }

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
              selectedDayTextColor: "#333333",
              todayTextColor: "#000000",
              textDayFontWeight: "bold",
              dayTextColor: theme.colors.disabled,
              textDayFontFamily: "InterBold",
              textDayHeaderFontFamily: "InterThin",
              textDayFontSize: 16,
            }}
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
