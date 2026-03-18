import * as React from "react";
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Control, useController } from "react-hook-form";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { ToggleSwitch } from "../../settings/components/toggle-switch";
import { SingleDateCalendar } from "./single-date-calendar";
import TimePicker from "./time-picker";

interface DeadlineSectionProps {
  control: Control<any>;
}

export const DeadlineSection = ({ control }: DeadlineSectionProps) => {
  const { t, i18n } = useTranslation("tasks");
  const isChinese = i18n.language === "zh";
  const locale = isChinese ? zhCN : enUS;
  const dateFormat = isChinese ? "yyyy年M月d日" : "MMM d, yyyy";

  const [activeSelector, setActiveSelector] = useState<"deadlineDate" | "deadlineTime" | null>(null);

  const {
    field: { value: isDdl, onChange: onIsDdlChange },
  } = useController({
    control,
    name: "isDdl",
  });

  const {
    field: { value: deadlineDate, onChange: onDeadlineDateChange },
  } = useController({
    control,
    name: "deadlineDate",
  });

  const {
    field: { value: deadlineTime, onChange: onDeadlineTimeChange },
  } = useController({
    control,
    name: "deadlineTime",
  });

  const deadlineDateDisplayText = deadlineDate
    ? format(deadlineDate, dateFormat, { locale })
    : t("form.selectDate");
  const deadlineTimeDisplayText = deadlineTime
    ? format(deadlineTime, "hh:mm a")
    : t("form.selectTime");

  return (
    <Animated.View layout={MotionAnimations.layout}>
      {/* Deadline Toggle */}
      <Animated.View
        className={`flex-row justify-between items-center ${isDdl ? "mb-4" : ""}`}
        layout={MotionAnimations.layout}
      >
        <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.markAsDeadline")}</Text>
        <ToggleSwitch value={isDdl} onChange={() => onIsDdlChange(!isDdl)} />
      </Animated.View>

      {/* Due Time  */}
      {isDdl && (
        <Animated.View
          entering={MotionAnimations.upEntering}
          exiting={MotionAnimations.outExiting}
          layout={MotionAnimations.layout}
        >
          <Animated.View className="mb-4" layout={MotionAnimations.layout}>
            <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
              <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.dueTime")}</Text>
              <View className="flex-row">
                <Pressable
                  onPress={() =>
                    setActiveSelector((prev) => (prev === "deadlineDate" ? null : "deadlineDate"))
                  }
                  className="bg-background px-4 py-2 rounded-xl mr-2"
                >
                  <Text className="text-xl font-balooThin text-secondary">
                    {deadlineDateDisplayText}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setActiveSelector((prev) => (prev === "deadlineTime" ? null : "deadlineTime"))
                  }
                  className="bg-background px-4 py-2 rounded-xl"
                >
                  <Text className="text-xl font-balooThin text-secondary">
                    {deadlineTimeDisplayText}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            {activeSelector === "deadlineDate" && (
              <Animated.View
                entering={MotionAnimations.upEntering}
                exiting={MotionAnimations.outExiting}
              >
                <SingleDateCalendar
                  defaultStartDate={format(deadlineDate || new Date(), "yyyy-MM-dd")}
                  onStartDateChange={onDeadlineDateChange}
                />
              </Animated.View>
            )}

            {activeSelector === "deadlineTime" && (
              <Animated.View
                entering={MotionAnimations.upEntering}
                exiting={MotionAnimations.outExiting}
                className="items-center"
              >
                <TimePicker value={deadlineTime || new Date()} onChange={onDeadlineTimeChange} />
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
};
