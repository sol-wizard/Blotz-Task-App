import React, { useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { Menu, Button } from "react-native-paper";
import { Controller } from "react-hook-form";
import { LabelDTO } from "@/shared/models/label-dto";

interface LabelSelectProps {
  control: any;
  labels: LabelDTO[];
  selectedValue: number | null;
}

export function LabelSelect({ control, labels, selectedValue }: LabelSelectProps) {
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
      style={{
        opacity: disabled ? 0.5 : 1,
        minHeight: 44, // 满足 accessibility 要求
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: item.color,
        borderWidth: selected ? 2 : 0, // 选中时显示黑色边框
        borderColor: selected ? "#000" : "transparent",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text className="font-baloo">{item.name}</Text>
    </Pressable>
  );

  return (
    <Controller
      control={control}
      name="labelId"
      render={({ field: { onChange } }) => {
        return (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
            {labels.map((l) => (
              <Chip
                key={l.labelId}
                item={l}
                selected={selectedValue === l.labelId}
                onPress={() => {
                  // If the clicked one is already selected, deselect it (set to null)
                  // Otherwise, select the new labelId
                  const nextValue = selectedValue === l.labelId ? null : l.labelId;
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
