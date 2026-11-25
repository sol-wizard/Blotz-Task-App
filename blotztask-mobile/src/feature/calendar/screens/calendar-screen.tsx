import React, { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { format } from "date-fns";
import { CalendarProvider, WeekCalendar } from "react-native-calendars";
import { theme } from "@/shared/constants/theme";
import CalendarHeader from "../components/calendar-header";
import { FilteredTaskList } from "../components/filtered-task-list";
import { FloatingAddButton } from "../components/floating-add-button";
import { useTaskDays } from "../hooks/useTaskDays";
import { getMarkedDates } from "../util/get-marked-dates";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { CustomDay, CustomDayProps } from "../components/custom-day";
import { ModeBottomSheet } from "../../pomodoro/components/pomodoro-mode-bottomsheet";
import { usePomodoroSettingsQuery } from "../../pomodoro/hooks/usePomodoroSetting";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "expo-router";
import { analytics } from "@/shared/services/analytics";
import { SCREEN_NAMES } from "@/shared/constants/posthog-events";

const calendarTheme = {
  calendarBackground: theme.colors.background,
};

export default function CalendarScreen() {
  const { i18n } = useTranslation();
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const { weeklyTaskAvailability, isLoading } = useTaskDays({ selectedDay });
  const progress = useSharedValue(isCalendarVisible ? 1 : 0);
  const [isModeSheetOpen, setIsModeSheetOpen] = useState(false);
  const { data: pomodoroSetting } = usePomodoroSettingsQuery();
  const screenRef = useRef<View>(null);
  const [listAreaTop, setListAreaTop] = useState<{ y: number; isMeasured: boolean }>();
  const insets = useSafeAreaInsets();

  // Tab screens stay mounted, so record a view on every focus, not only on mount.
  useFocusEffect(
    useCallback(() => {
      analytics.trackScreenViewed(SCREEN_NAMES.HOME_CALENDAR);
    }, []),
  );

  // Where the task list starts (below the status tabs), from the top of this screen. The floating +
  // may only move below it. measureLayout reads the final layout, not a frame mid-animation.
  // If it can't be measured, the + still shows, at its default spot, and may move anywhere below
  // the status bar.
  const handleListAreaLayout = useCallback(
    (listArea: View) => {
      const setTop = (y: number, isMeasured: boolean) =>
        setListAreaTop((prev) =>
          prev?.y === y && prev.isMeasured === isMeasured ? prev : { y, isMeasured },
        );
      // measureLayout answers straight away, but returns without calling either callback when a
      // ref isn't a native view, so check that one of them ran.
      let answered = false;
      if (screenRef.current) {
        listArea.measureLayout(
          screenRef.current,
          (_x, y) => {
            answered = true;
            setTop(y, true);
          },
          () => {
            answered = true;
            setTop(insets.top, false);
          },
        );
      }
      if (!answered) setTop(insets.top, false);
    },
    [insets.top],
  );

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

  return (
    <SafeAreaView ref={screenRef} className="flex-1 bg-background" edges={["top"]}>
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
        key={i18n.language}
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
              testID="week-calendar"
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
          onListAreaLayout={handleListAreaLayout}
        />
      </CalendarProvider>
      {/* Over the whole screen rather than inside the task list: inside a view with a layout
          animation, every frame of a drag stutters. Only on Home: on Notes a + that makes a task
          (not a note) would confuse, and would cover its add bar. */}
      <FloatingAddButton
        date={format(selectedDay, "yyyy-MM-dd")}
        top={listAreaTop?.y}
        startAtDefault={listAreaTop?.isMeasured === false}
      />
      {pomodoroSetting && (
        <ModeBottomSheet
          key={isModeSheetOpen ? "open" : "closed"}
          isOpen={isModeSheetOpen}
          onClose={() => {
            setIsModeSheetOpen(false);
          }}
          selectedSoundscape={pomodoroSetting.sound}
          selectedDuration={pomodoroSetting.timing}
        />
      )}
    </SafeAreaView>
  );
}
