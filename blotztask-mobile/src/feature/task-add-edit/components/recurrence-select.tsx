import React from "react";
import { Text } from "react-native";
import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { AnimatedDropdown, DropdownOption } from "@/shared/components/ui/animated-dropdown";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";

type RecurrenceSelectProps = {
  control: Control<TaskFormField>;
};

export const RecurrenceSelect = ({ control }: RecurrenceSelectProps) => {
  const { t } = useTranslation("tasks");
  const recurrenceOptions: DropdownOption<TaskFormField["recurrence"]>[] = [
    { label: t("recurrence.never"), value: "never" },
    { label: t("recurrence.daily"), value: "daily" },
    { label: t("recurrence.weekly"), value: "weekly" },
    { label: t("recurrence.biweekly"), value: "biweekly" },
    { label: t("recurrence.monthly"), value: "monthly" },
    { label: t("recurrence.yearly"), value: "yearly" },
  ];

  return (
    <Controller
      control={control}
      name="recurrence"
      defaultValue="never"
      render={({ field: { value, onChange } }) => (
        <Animated.View
          className="flex-row items-center justify-between"
          layout={MotionAnimations.layout}
        >
          <Text className="font-baloo text-secondary text-xl mt-1">{t("form.repeat")}</Text>
          <AnimatedDropdown
            value={value}
            onChange={onChange}
            options={recurrenceOptions}
            placeholder={t("recurrence.never")}
            minWidth={230}
          />
        </Animated.View>
      )}
    />
  );
};
