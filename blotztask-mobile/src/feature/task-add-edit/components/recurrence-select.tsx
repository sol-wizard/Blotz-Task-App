import React from "react";
import { Text, View } from "react-native";
import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { AnimatedDropdown, DropdownOption } from "@/shared/components/animated-dropdown";
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
          <View className="flex-row items-center mt-1">
            <Text className="font-baloo text-secondary text-xl">{t("form.repeat")}</Text>
            <View className="ml-2 rounded-full bg-lime-100 px-2 py-0.5">
              <Text className="font-balooBold text-[11px] uppercase text-highlight">
                {t("form.repeatBeta")}
              </Text>
            </View>
          </View>
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
