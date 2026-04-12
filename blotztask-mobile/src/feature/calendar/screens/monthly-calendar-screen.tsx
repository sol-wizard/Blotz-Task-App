import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from "react-native-calendars";
import { format } from "date-fns";
import { theme } from "@/shared/constants/theme";
import { useMonthlyTasks } from "../hooks/useMonthlyTasks";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MonthlyDay, MonthlyDayProps } from "../components/monthly-day";
import { DayDetailPanel } from "../components/day-detail-panel";
import { TaskThumbnailDTO } from "../models/monthly-task-indicator-dto";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const L1_OFFSET = SCREEN_HEIGHT - 90;
const L2_OFFSET = SCREEN_HEIGHT * 0.5;
const L3_OFFSET = 100;

export default function MonthlyCalendarScreen() {
  const params = useLocalSearchParams<{ selectedDate: string }>();
  const initialSelectedDate =
    typeof params.selectedDate === "string" ? new Date(params.selectedDate) : new Date();
  const [selectedDay, setSelectedDay] = useState(initialSelectedDate);

  const selectedDateStr = format(selectedDay, "yyyy-MM-dd");
  const selectedMonthKey = format(selectedDay, "yyyy-MM");

  const translateY = useSharedValue(L1_OFFSET);
  const context = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(L3_OFFSET - 50, context.value + event.translationY);
    })
    .onEnd((event) => {
      const targetY = translateY.value + event.velocityY * 0.1;
      let finalY = L1_OFFSET;

      if (targetY < (L2_OFFSET + L3_OFFSET) / 2) {
        finalY = L3_OFFSET;
      } else if (targetY < (L1_OFFSET + L2_OFFSET) / 2) {
        finalY = L2_OFFSET;
      } else {
        finalY = L1_OFFSET;
      }

      translateY.value = withSpring(finalY, { damping: 50, stiffness: 180, mass: 0.8 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const { monthlyTaskAvailability } = useMonthlyTasks({ selectedDay });

  const dataByDate = useMemo(() => {
    const data: Record<string, TaskThumbnailDTO[]> = {};
    monthlyTaskAvailability.forEach((item) => {
      const dateKey = item.date.substring(0, 10);
      data[dateKey] = item.taskThumbnails;
    });
    return data;
  }, [monthlyTaskAvailability]);

  const handleDayPress = useCallback((dateString: string) => {
    setSelectedDay(new Date(dateString));
  }, []);

  const renderDay = useCallback(
    (props: MonthlyDayProps) => (
      <MonthlyDay
        {...props}
        selectedDate={selectedDateStr}
        tasks={dataByDate[props.date?.dateString ?? ""] ?? []}
        onPressDay={handleDayPress}
      />
    ),
    [selectedDateStr, dataByDate, handleDayPress],
  );

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 bg-white rounded-full items-center justify-center shadow-sm border border-gray-50"
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={theme.colors.onSurface} />
          </Pressable>

          <Pressable
            onPress={() => setSelectedDay(new Date())}
            className="bg-white px-5 py-1.5 rounded-full shadow-sm border border-gray-50"
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text className="text-sm font-balooBold text-secondary">Today</Text>
          </Pressable>
        </View>

        <View className="px-2">
          <Calendar
            key={selectedMonthKey}
            current={selectedDateStr}
            onMonthChange={(month: DateData) => {
              setSelectedDay(new Date(month.year, month.month - 1, 1));
            }}
            hideExtraDays
            firstDay={1}
            enableSwipeMonths
            dayComponent={renderDay}
            theme={{
              calendarBackground: theme.colors.background,
              textDayHeaderFontFamily: "BalooBold",
              textDayHeaderFontSize: 13,
              textSectionTitleColor: "#9CA3AF",
              monthTextColor: "#444964",
              textMonthFontFamily: "BalooExtraBold",
              textMonthFontSize: 32,
              arrowColor: "#E5E7EB",
            }}
          />
        </View>
      </SafeAreaView>

      <Animated.View
        className="absolute inset-x-0 bg-white rounded-t-[32px] z-[100]"
        style={[
          animatedStyle,
          {
            height: SCREEN_HEIGHT,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 20,
          },
        ]}
      >
        <GestureDetector gesture={gesture}>
          <View className="w-full pt-4 pb-4 px-6 items-center">
            <View
              className="w-12 h-1.5 rounded-full mb-5"
              style={{ backgroundColor: theme.colors.secondary }}
            />
            <View className="w-full items-start">
              <Text className="text-[16px] font-baloo text-secondary">
                {format(selectedDay, "E, d MMM yyyy")}
              </Text>
            </View>
          </View>
        </GestureDetector>

        <View className="flex-1">
          <DayDetailPanel selectedDay={selectedDay} />
        </View>
      </Animated.View>
    </View>
  );
}
