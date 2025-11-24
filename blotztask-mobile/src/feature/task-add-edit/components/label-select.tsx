import React from "react";
import { View, Pressable, Text } from "react-native";
import { Controller } from "react-hook-form";
import { LabelDTO } from "@/shared/models/label-dto";

interface LabelSelectProps {
  control: any;
  labels: LabelDTO[];
}

export function LabelSelect({ control, labels }: LabelSelectProps) {
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
      className={`min-h-[44px] px-[14px] py-[10px] rounded-xl mr-2 mb-2 ${selected ? "border-2 border-black" : "border-0 border-transparent"}`}
    >
      <Text className="font-baloo">{item.name}</Text>
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
