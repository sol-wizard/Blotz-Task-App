import React from "react";
import { Text } from "react-native";
import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { AnimatedDropdown } from "@/shared/components/ui/animated-dropdown";

type AlertSelectProps = {
  control: Control<any>;
  name?: string;
};

export const AlertSelect: React.FC<AlertSelectProps> = ({ control, name = "alert" }) => {
  const { t } = useTranslation("tasks");

  const ALERT_OPTIONS = [
    { label: t("alerts.none"), value: null },
    { label: t("alerts.atTime"), value: 0 },
    { label: t("alerts.5min"), value: 300 },
    { label: t("alerts.10min"), value: 600 },
    { label: t("alerts.30min"), value: 1800 },
    { label: t("alerts.1hour"), value: 3600 },
    { label: t("alerts.2hours"), value: 7200 },
    { label: t("alerts.1day"), value: 86400 },
    { label: t("alerts.2days"), value: 172800 },
  ];

  return (
    <Controller
      control={control}
      name={name}
      defaultValue={300}
      render={({ field: { value, onChange } }) => (
        <Animated.View
          className="flex-row items-center justify-between"
          layout={MotionAnimations.layout}
        >
          <Text className="font-baloo text-secondary text-2xl mt-1">{t("form.alert")}</Text>

          <AnimatedDropdown
            value={value}
            onChange={(v) => onChange(v)}
            options={ALERT_OPTIONS}
            placeholder={t("alerts.none")}
            minWidth={230}
          />
        </Animated.View>
      )}
    />
  );
};
