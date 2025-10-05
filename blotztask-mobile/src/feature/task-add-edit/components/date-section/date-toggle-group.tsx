import React from "react";
import { SegmentedButtons } from "react-native-paper";

interface DateToggleOption {
  value: string;
  label: string;
}

interface DateToggleGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: DateToggleOption[];
}

const DateToggleGroup = ({
  value,
  onValueChange,
  options,
}: DateToggleGroupProps) => {
  return (
    <SegmentedButtons
      value={value}
      onValueChange={onValueChange}
      buttons={options.map((option) => ({
        value: option.value,
        label: option.label,
        style: {
          borderRadius: 8, // Less rounded, more rectangular
        },
      }))}
      density="small"
      style={{
        borderRadius: 8, // Container also less rounded
      }}
    />
  );
};

export default DateToggleGroup;
