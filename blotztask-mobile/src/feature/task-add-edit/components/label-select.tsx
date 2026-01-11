import React from "react";
import { View, Pressable, Text } from "react-native";
import { Controller } from "react-hook-form";
import { LabelDTO } from "@/shared/models/label-dto";
import { useTranslation } from "react-i18next";

interface LabelSelectProps {
  control: any;
  labels: LabelDTO[];
}

export function LabelSelect({ control, labels }: LabelSelectProps) {
  const { t } = useTranslation("tasks");

  const getTranslatedLabelName = (labelName: string): string => {
    const lowerName = labelName.toLowerCase();
    const translationKey = `categories.${lowerName}`;
    const translated = t(translationKey);
    // If translation key doesn't exist, return original name
    return translated !== translationKey ? translated : labelName;
  };

  const Chip = ({
    item,
    selected,
    onPress,
    disabled,
  }: {
    item: LabelDTO;
    selected: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      style={{ backgroundColor: item.color }}
      className={`min-h-[44px] px-[14px] py-[10px] rounded-xl mr-2 mb-2 border-2 ${selected ? "border-black" : "border-transparent"}`}
    >
      <Text className="font-baloo">{getTranslatedLabelName(item.name)}</Text>
    </Pressable>
  );

  return (
    <Controller
      control={control}
      name="labelId"
      render={({ field: { onChange, value } }) => {
        return (
          <View className="flex-row flex-wrap mt-3">
            {labels.map((l) => (
              <Chip
                key={l.labelId}
                item={l}
                selected={value === l.labelId}
                onPress={() => {
                  const nextValue = value === l.labelId ? null : l.labelId;
                  onChange(nextValue);
                }}
              />
            ))}
          </View>
        );
      }}
    />
  );
}
