import React from "react";
import { View, Text } from "react-native";
import { Controller, Control } from "react-hook-form";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";
import { FormDivider } from "@/shared/components/ui/form-divider";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";

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

          <Dropdown
            data={ALERT_OPTIONS}
            labelField="label"
            valueField="value"
            placeholder={t("alerts.none")}
            placeholderStyle={{
              fontSize: 16,
              color: "#444964",
              textAlign: "right",
              fontFamily: "BalooRegular",
            }}
            value={value}
            onChange={(item) => onChange(item.value)}
            style={{
              minWidth: 230,
              paddingHorizontal: 4,
            }}
            activeColor="transparent"
            autoScroll={false}
            selectedTextStyle={{
              fontSize: 16,
              color: "#444964",
              textAlign: "right",
              fontFamily: "BalooRegular",
            }}
            containerStyle={{
              borderRadius: 24,
              paddingVertical: 8,
              paddingHorizontal: 12,
              elevation: 4,
            }}
            renderItem={(item, selected) => (
              <View key={item.label}>
                <View className="flex-row h-12 items-center">
                  <View className="w-6 items-center justify-center mr-1">
                    {selected && <Ionicons name="checkmark" size={18} color="#3E415C" />}
                  </View>
                  <Text className="text-secondary font-baloo text-lg">{item.label}</Text>
                </View>
                <FormDivider marginVertical={2} />
              </View>
            )}
          />
        </Animated.View>
      )}
    />
  );
};
