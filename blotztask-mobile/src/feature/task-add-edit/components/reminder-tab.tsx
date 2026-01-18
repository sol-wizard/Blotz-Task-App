import { useController } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useState } from "react";
import TimePicker from "./time-picker";
import { SingleDateCalendar } from "./single-date-calendar";
import { useTranslation } from "react-i18next";
import Animated, { FadeInUp, FadeOut, LinearTransition } from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";

export const ReminderTab = ({ control }: { control: any }) => {
  const [activeSelector, setActiveSelector] = useState<"date" | "time" | null>(null);

  const {
    field: { value: startDate, onChange: onStartDateChange },
  } = useController({
    control,
    name: "startDate",
  });

  const {
    field: { value: startTime, onChange: onStartTimeChange },
  } = useController({
    control,
    name: "startTime",
  });

  const {
    field: { onChange: onEndDateChange },
  } = useController({
    control,
    name: "endDate",
  });

  const {
    field: { onChange: onEndTimeChange },
  } = useController({
    control,
    name: "endTime",
  });

  const { t, i18n } = useTranslation("tasks");
  const isChinese = i18n.language === "zh";
  const locale = isChinese ? zhCN : enUS;
  const dateFormat = isChinese ? "yyyy年M月d日" : "MMM d, yyyy";
  const dateDisplayText = startDate
    ? format(startDate, dateFormat, { locale })
    : t("form.selectDate");
  const timeDisplayText = startTime ? format(startTime, "hh:mm a") : t("form.selectTime");

  return (
    <Animated.View
      className="mb-4"
      layout={MotionAnimations.layout}
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.leftExiting}
    >
      {/* Date  */}
      <Animated.View className="mb-4" layout={MotionAnimations.layout}>
        <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
          <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.date")}</Text>
          <Pressable
            onPress={() => setActiveSelector((prev) => (prev === "date" ? null : "date"))}
            className="bg-background px-4 py-2 rounded-xl"
          >
            <Text className="text-xl font-balooThin text-secondary">{dateDisplayText}</Text>
          </Pressable>
        </Animated.View>

        {activeSelector === "date" && (
          <Animated.View
            entering={MotionAnimations.upEntering}
            exiting={MotionAnimations.outExiting}
          >
            <SingleDateCalendar
              defaultStartDate={format(startDate, "yyyy-MM-dd")}
              onStartDateChange={(nextDate: Date) => {
                onStartDateChange(nextDate);
                onEndDateChange(nextDate);
              }}
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Time  */}
      <Animated.View className="justify-center" layout={MotionAnimations.layout}>
        <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
          <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.time")}</Text>

          <Pressable
            onPress={() => setActiveSelector((prev) => (prev === "time" ? null : "time"))}
            className="bg-background px-4 py-2 rounded-xl"
          >
            <Text className="text-xl font-balooThin text-secondary ">{timeDisplayText}</Text>
          </Pressable>
        </Animated.View>

        <View className="items-center">
          {activeSelector === "time" && (
            <Animated.View
              entering={MotionAnimations.upEntering}
              exiting={MotionAnimations.outExiting}
            >
              <TimePicker
                value={startTime}
                onChange={(nextTime: Date) => {
                  onStartTimeChange(nextTime);
                  onEndTimeChange(nextTime);
                }}
              />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};
