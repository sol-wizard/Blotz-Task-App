import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { format } from "date-fns";
import { theme } from "@/shared/constants/theme";
import { useMonthlyTasks } from "../hooks/useMonthlyTasks";
import { useLocalSearchParams } from "expo-router";

import { MonthlyDay, MonthlyDayProps } from "../components/monthly-day";
import { SelectedDayDetailPanel } from "../components/day-detail-panel";
import { TaskThumbnailDTO } from "../models/monthly-task-indicator-dto";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { formatBottomSheetDate } from "@/feature/calendar/util/date-formatter";
import i18n from "@/i18n";
import { ReturnButton } from "@/shared/components/return-button";

const SNAP_L1 = "10%";
const SNAP_L2 = "50%";
const SNAP_L3 = "80%";
const SNAP_POINTS = [SNAP_L1, SNAP_L2, SNAP_L3];

export default function MonthlyCalendarScreen() {
  // Hooks
  const { selectedDate } = useLocalSearchParams<{ selectedDate: string }>();
  const [selectedDay, setSelectedDay] = useState(new Date(selectedDate || new Date()));
  const { monthlyTaskAvailability } = useMonthlyTasks({ selectedDay });

  // Derived values
  const selectedDateStr = format(selectedDay, "yyyy-MM-dd");
  const selectedMonthKey = format(selectedDay, "yyyy-MM");

  const dataByDate: Record<string, TaskThumbnailDTO[]> = {};
  monthlyTaskAvailability.forEach((item) => {
    const dateKey = item.date.split("T")[0];
    dataByDate[dateKey] = item.taskThumbnails;
  });

  // Functions
  const handleDayPress = (dateString: string) => {
    setSelectedDay(new Date(dateString));
  };

  const renderDay = (props: MonthlyDayProps) => (
    <MonthlyDay
      {...props}
      selectedDate={selectedDateStr}
      tasks={dataByDate[props.date?.dateString ?? ""] ?? []}
      onPressDay={handleDayPress}
    />
  );

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center justify-between px-6 pt-4">
          <ReturnButton className="bg-white shadow-sm border-gray-50 w-9 h-9" />

          <Pressable
            onPress={() => setSelectedDay(new Date())}
            className="bg-white px-5 py-1.5 rounded-full border border-gray-50"
          >
            <Text className="text-base font-balooBold text-secondary">
              {i18n.t("calendar:header.today")}
            </Text>
          </Pressable>
        </View>

        <View className="px-2 mt-2">
          <Calendar
            key={selectedMonthKey}
            current={selectedDateStr}
            onMonthChange={(month: DateData) => {
              setSelectedDay(new Date(month.year, month.month - 1, 1));
            }}
            hideExtraDays
            firstDay={1}
            enableSwipeMonths
            monthFormat={"MMMM"}
            renderHeader={(date: any) => {
              const monthIndex = date.getMonth() + 1;
              return (
                <Text className="text-4xl font-balooBold text-secondary">{`${monthIndex}月`}</Text>
              );
            }}
            dayComponent={renderDay}
            theme={{
              calendarBackground: theme.colors.background,
              textDayHeaderFontFamily: "Inter",
              textDayHeaderFontSize: 11,
              textSectionTitleColor: theme.colors.onSurface,
              monthTextColor: theme.colors.onSurface,
              textMonthFontFamily: "BalooBold",
              textMonthFontSize: 24,
              arrowColor: theme.colors.secondary,
            }}
          />
        </View>
      </SafeAreaView>

      <BottomSheet
        index={0}
        snapPoints={SNAP_POINTS}
        handleComponent={null}
        backgroundStyle={{
          backgroundColor: "white",
          borderRadius: 32,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 20,
        }}
      >
        <BottomSheetView className="flex-1">
          <View className="w-full pt-4 pb-4 px-6 items-center">
            <View
              className="w-12 h-1.5 rounded-full mb-5"
              style={{ backgroundColor: theme.colors.secondary }}
            />
            <View className="w-full items-start">
              <Text className="text-base font-baloo text-secondary">
                {formatBottomSheetDate(selectedDay)}
              </Text>
            </View>
          </View>

          <View className="flex-1">
            <SelectedDayDetailPanel selectedDay={selectedDay} />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}
