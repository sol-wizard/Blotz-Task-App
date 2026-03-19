import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarProvider, WeekCalendar } from "react-native-calendars";
import { theme } from "@/shared/constants/theme";
import CalendarHeader from "../components/calendar-header";
import { FilteredTaskList } from "../components/filtered-task-list";
import { useTaskDays } from "../hooks/useTaskDays";
import { getMarkedDates } from "../util/get-marked-dates";
import { usePushNotificationSetup } from "@/shared/hooks/usePushNotificationSetup";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { CustomDay, CustomDayProps } from "../components/custom-day";

const calendarTheme = {
  calendarBackground: theme.colors.background,
};

export default function CalendarScreen() {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const { weeklyTaskAvailability, isLoading } = useTaskDays({ selectedDay });
  const progress = useSharedValue(isCalendarVisible ? 1 : 0);
  usePushNotificationSetup();

  const markedDates = isLoading ? {} : getMarkedDates({ weeklyTaskAvailability });

  const handleDayPress = (dateString: string) => {
    setSelectedDay(new Date(dateString));
  };

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
              allowShadow={false}
              calendarHeight={82}
              firstDay={1}
              hideDayNames={true}
              markedDates={markedDates}
              dayComponent={(props: CustomDayProps) => (
                <CustomDay
                  {...props}
                  isMarked={Boolean(props.marking?.marked)}
                  onPressDay={handleDayPress}
                />
              )}
            />
          </Animated.View>
        )}

        <FilteredTaskList selectedDay={selectedDay} />
      </CalendarProvider>
    </SafeAreaView>
  );
}
