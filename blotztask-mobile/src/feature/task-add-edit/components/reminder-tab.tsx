import { Control, useController, UseFormClearErrors, UseFormSetValue, FieldValues, Path } from "react-hook-form";
import { View, Text, Pressable } from "react-native";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useState } from "react";
import TimePicker from "./time-picker";
import { SingleDateCalendar } from "./single-date-calendar";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";

export interface TabFormValues extends FieldValues {
  startDate: Date;
  startTime: Date;
  endDate: Date;
  endTime: Date;
  deadlineDate?: Date | null;
  isDeadline?: boolean;
}

export const ReminderTab = <T extends TabFormValues>({
  control,
  setValue,
  clearErrors,
}: {
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  clearErrors: UseFormClearErrors<T>;
}) => {
  const [activeSelector, setActiveSelector] = useState<"date" | "time" | null>(null);

  const {
    field: { value: startDate },
  } = useController({
    control,
    name: "startDate" as Path<T>,
  });

  const {
    field: { value: startTime },
  } = useController({
    control,
    name: "startTime" as Path<T>,
  });

  const {
    field: { value: deadlineDate },
  } = useController({
    control,
    name: "deadlineDate" as Path<T>,
  });

  const {
    field: { value: isDdl },
  } = useController({
    control,
    name: "isDeadline" as Path<T>,
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
      layout={MotionAnimations.layout}
      entering={MotionAnimations.rightEntering}
      exiting={MotionAnimations.leftExiting}
    >
      {/* Date  */}
      <Animated.View className="mb-4" layout={MotionAnimations.layout}>
        <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
          <Text className="font-baloo text-secondary text-xl mt-1">{t("form.date")}</Text>
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
              deadlineDate={isDdl && deadlineDate ? format(deadlineDate, "yyyy-MM-dd") : undefined}
              onStartDateChange={(nextDate: Date) => {
                setValue("startDate" as Path<T>, nextDate as any, { shouldValidate: false });
                setValue("endDate" as Path<T>, nextDate as any, { shouldValidate: false });
                clearErrors(["endDate", "endTime"] as any);
              }}
            />
          </Animated.View>
        )}
      </Animated.View>

      {/* Time  */}
      <Animated.View className="justify-center" layout={MotionAnimations.layout}>
        <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
          <Text className="font-baloo text-secondary text-xl mt-1">{t("form.time")}</Text>

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
                  setValue("startTime" as Path<T>, nextTime as any, { shouldValidate: false });
                  setValue("endTime" as Path<T>, nextTime as any, { shouldValidate: false });
                  clearErrors(["endDate", "endTime"] as any);
                }}
              />
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};
