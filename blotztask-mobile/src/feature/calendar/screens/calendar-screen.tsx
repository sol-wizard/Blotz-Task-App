import React, { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarProvider, WeekCalendar } from "react-native-calendars";
import { theme } from "@/shared/constants/theme";
import CalendarHeader from "../components/calendar-header";
import { FilteredTaskList } from "../components/filtered-task-list";
import { useTaskDays } from "../hooks/useTaskDays";
import { getMarkedDates } from "../util/get-marked-dates";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { CustomDay, CustomDayProps } from "../components/custom-day";
import { useLocalSearchParams } from "expo-router";
import { ModeBottomSheet } from "../../pomodoro/components/pomodoro-mode-bottomsheet";
import { PomodoroFocus } from "../../pomodoro/components/pomodoro-focus";
import { usePomodoroSettingsQuery } from "../../pomodoro/hooks/usePomodoroSetting";

const calendarTheme = {
  calendarBackground: theme.colors.background,
};

export default function CalendarScreen() {
  const params = useLocalSearchParams<{ selectedDate?: string | string[] }>();
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [calendarKey, setCalendarKey] = useState(0);
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const { weeklyTaskAvailability, isLoading } = useTaskDays({ selectedDay });
  const progress = useSharedValue(isCalendarVisible ? 1 : 0);
  const [isModeSheetOpen, setIsModeSheetOpen] = useState(false);
  const [isFocusSheetOpen, setIsFocusSheetOpen] = useState(false);
  const { data: pomodoroSetting } = usePomodoroSettingsQuery();

  const markedDates = isLoading ? {} : getMarkedDates({ weeklyTaskAvailability });

  const handleDayPress = useCallback((dateString: string) => {
    setSelectedDay(new Date(dateString));
  }, []);

  const renderDay = useCallback(
    (props: CustomDayProps) => (
      <CustomDay {...props} isMarked={Boolean(props.marking?.marked)} onPressDay={handleDayPress} />
    ),
    [handleDayPress],
  );

  useEffect(() => {
    if (typeof params.selectedDate !== "string") return;

    const parsedDate = new Date(params.selectedDate);
    if (Number.isNaN(parsedDate.getTime())) return;

    setSelectedDay(parsedDate);
    setCalendarKey((k) => k + 1);
  }, [params.selectedDate]);

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
        key={calendarKey}
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
              dayComponent={renderDay}
            />
          </Animated.View>
        )}

        <FilteredTaskList
          selectedDay={selectedDay}
          onOpenMode={() => setIsModeSheetOpen(true)}
          onOpenFocus={() => setIsFocusSheetOpen(true)}
        />
      </CalendarProvider>
      {pomodoroSetting && (
        <ModeBottomSheet
          isOpen={isModeSheetOpen}
          onClose={() => {
            setIsModeSheetOpen(false);
          }}
          selectedSoundscape={pomodoroSetting.sound}
          selectedDuration={pomodoroSetting.timing}
        />
      )}
      {pomodoroSetting && (
        <PomodoroFocus
          isOpen={isFocusSheetOpen}
          onClose={() => {
            setIsFocusSheetOpen(false);
          }}
          selectedSoundscape={pomodoroSetting.sound}
          selectedDuration={pomodoroSetting.timing}
        />
      )}
    </SafeAreaView>
  );
}
