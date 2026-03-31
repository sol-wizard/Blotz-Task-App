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

import { SegmentButtonValue } from "../models/segment-button-value";

interface DeadlineSectionProps {
  control: Control<any>;
  getValues: (name: any) => any;
  isActiveTab: SegmentButtonValue;
}

export const DeadlineSection = ({ control, getValues, isActiveTab }: DeadlineSectionProps) => {
  const { t, i18n } = useTranslation("tasks");
  const isChinese = i18n.language === "zh";
  const locale = isChinese ? zhCN : enUS;
  const dateFormat = isChinese ? "yyyy年M月d日" : "MMM d, yyyy";

  const [activeSelector, setActiveSelector] = useState<"deadlineDate" | "deadlineTime" | null>(
    null,
  );

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

  const {
    field: { value: startDate },
  } = useController({
    control,
    name: "startDate",
  });

  const {
    field: { value: endDate },
  } = useController({
    control,
    name: "endDate",
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
        <Text className="font-baloo text-secondary text-xl mt-1">{t("form.markAsDeadline")}</Text>
        <ToggleSwitch
          value={isDdl}
          onChange={() => {
            const nextValue = !isDdl;
            onIsDdlChange(nextValue);

            // Only sync when turning ON
            if (nextValue) {
              onDeadlineDateChange(getValues("endDate"));
              onDeadlineTimeChange(getValues("endTime"));
            }
            setActiveSelector(null);
          }}
        />
      </Animated.View>

      {/* Due Time  */}
      {isDdl && (
        <Animated.View
          entering={MotionAnimations.upEntering}
          exiting={MotionAnimations.outExiting}
          layout={MotionAnimations.layout}
        >
          <Animated.View layout={MotionAnimations.layout}>
            <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
              <Text className="font-baloo text-secondary text-xl mt-1">{t("form.dueTime")}</Text>
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
                  deadlineDate={deadlineDate ? format(deadlineDate, "yyyy-MM-dd") : undefined}
                  eventStartDate={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
                  eventEndDate={
                    isActiveTab === "event" && endDate
                      ? format(endDate, "yyyy-MM-dd")
                      : startDate
                      ? format(startDate, "yyyy-MM-dd")
                      : undefined
                  }
                  isDeadlinePicker={true}
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
