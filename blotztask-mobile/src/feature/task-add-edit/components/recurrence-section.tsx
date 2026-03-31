import { FormDivider } from "@/shared/components/ui/form-divider";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text } from "react-native";
import Animated from "react-native-reanimated";
import RepeatSelectSheet, { RepeatConfig } from "./repeat-select-sheet";

type RecurrenceSectionProps = {
  selectedDate: Date;
  repeatConfig: RepeatConfig | null;
  repeatSummary: string | null;
  onChange: (config: RepeatConfig, summary: string) => void;
};

export const RecurrenceSection = ({
  selectedDate,
  repeatConfig,
  repeatSummary,
  onChange,
}: RecurrenceSectionProps) => {
  const { t } = useTranslation("tasks");
  const [isRepeatSheetOpen, setRepeatSheetOpen] = useState(false);

  return (
    <>
      <Animated.View layout={MotionAnimations.layout}>
        <Pressable
          onPress={() => setRepeatSheetOpen(true)}
          className="flex-row items-center justify-between"
        >
          <Text className="font-baloo text-secondary text-xl mt-1">{t("form.repeat")}</Text>
          <Text className="font-baloo text-primary text-xl mt-1">
            {repeatSummary ?? t("form.never")}
          </Text>
        </Pressable>
      </Animated.View>
      <FormDivider />

      <RepeatSelectSheet
        visible={isRepeatSheetOpen}
        selectedDate={selectedDate}
        initialValue={repeatConfig}
        onClose={() => setRepeatSheetOpen(false)}
        onConfirm={(config, summary) => {
          onChange(config, summary);
        }}
      />
    </>
  );
};
