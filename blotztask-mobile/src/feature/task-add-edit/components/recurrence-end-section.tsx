import React, { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { Control, useController } from "react-hook-form";
import { format } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { AnimatedDropdown, DropdownOption } from "@/shared/components/animated-dropdown";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";
import { SingleDateCalendar } from "./single-date-calendar";

type RecurrenceEndSectionProps = {
  control: Control<TaskFormField>;
};

export const RecurrenceEndSection = ({ control }: RecurrenceEndSectionProps) => {
  const { t, i18n } = useTranslation("tasks");
  const isChinese = i18n.language === "zh";
  const locale = isChinese ? zhCN : enUS;
  const dateFormat = isChinese ? "yyyy年M月d日" : "MMM d, yyyy";
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const {
    field: { value: recurrence },
  } = useController({
    control,
    name: "recurrence",
  });

  const {
    field: { value: recurrenceEndMode, onChange: onRecurrenceEndModeChange },
  } = useController({
    control,
    name: "recurrenceEndMode",
  });

  const {
    field: { value: recurrenceEndDate, onChange: onRecurrenceEndDateChange },
    fieldState: { error },
  } = useController({
    control,
    name: "recurrenceEndDate",
  });

  const {
    field: { value: startDate },
  } = useController({
    control,
    name: "startDate",
  });

  const isRecurring = recurrence !== "never" && recurrence !== "custom";

  useEffect(() => {
    if (isRecurring) return;

    onRecurrenceEndModeChange("never");
    onRecurrenceEndDateChange(null);
  }, [isRecurring, onRecurrenceEndDateChange, onRecurrenceEndModeChange]);

  if (!isRecurring) return null;

  const recurrenceEndOptions: DropdownOption<TaskFormField["recurrenceEndMode"]>[] = [
    { label: t("recurrence.endNever"), value: "never" },
    { label: t("recurrence.endOnDate"), value: "onDate" },
  ];

  const recurrenceEndDateDisplayText = recurrenceEndDate
    ? format(recurrenceEndDate, dateFormat, { locale })
    : t("form.selectDate");

  return (
    <Animated.View layout={MotionAnimations.layout}>
      <Animated.View
        className="flex-row items-center justify-between"
        layout={MotionAnimations.layout}
      >
        <Text className="font-baloo text-secondary text-xl mt-1">{t("recurrence.end")}</Text>
        <AnimatedDropdown
          value={recurrenceEndMode}
          onChange={(next) => {
            onRecurrenceEndModeChange(next);
            if (next === "never") {
              onRecurrenceEndDateChange(null);
              setIsDatePickerOpen(false);
              return;
            }

            onRecurrenceEndDateChange(recurrenceEndDate ?? startDate);
          }}
          options={recurrenceEndOptions}
          placeholder={t("recurrence.endNever")}
          minWidth={230}
        />
      </Animated.View>

      {recurrenceEndMode === "onDate" && (
        <Animated.View
          entering={MotionAnimations.upEntering}
          exiting={MotionAnimations.outExiting}
          layout={MotionAnimations.layout}
          className="mt-4"
        >
          <Animated.View className="flex-row justify-between" layout={MotionAnimations.layout}>
            <Text className="font-baloo text-secondary text-xl mt-1">
              {t("recurrence.endDate")}
            </Text>
            <Pressable
              onPress={() => setIsDatePickerOpen((prev) => !prev)}
              className="bg-background px-4 py-2 rounded-xl"
            >
              <Text className="text-xl font-balooThin text-secondary">
                {recurrenceEndDateDisplayText}
              </Text>
            </Pressable>
          </Animated.View>

          {error?.message && (
            <Text className="text-red-500 text-sm mt-2 font-baloo">{t(error.message)}</Text>
          )}

          {isDatePickerOpen && (
            <Animated.View
              entering={MotionAnimations.upEntering}
              exiting={MotionAnimations.outExiting}
            >
              <SingleDateCalendar
                defaultStartDate={format(recurrenceEndDate ?? startDate, "yyyy-MM-dd")}
                onStartDateChange={onRecurrenceEndDateChange}
              />
            </Animated.View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};
