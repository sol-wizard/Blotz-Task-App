import React from "react";
import { SegmentedButtons } from "react-native-paper";

export enum DateToggleType {
  SINGLE_DAY = "1-day",
  MULTI_DAY = "multi-day",
}

interface DateToggleGroupProps {
  value: DateToggleType;
  onValueChange: (value: DateToggleType) => void;
}

const DateToggleGroup = ({ value, onValueChange }: DateToggleGroupProps) => {
  return (
    <SegmentedButtons
      value={value}
      onValueChange={onValueChange}
      buttons={[
        {
          value: DateToggleType.SINGLE_DAY,
          label: "1-day",
          style: {
            borderRadius: 8, // Less rounded, more rectangular
            backgroundColor: value === DateToggleType.SINGLE_DAY ? "#bef264" : "#eee",
          },
        },
        {
          value: DateToggleType.MULTI_DAY,
          label: "Multi-day",
          style: {
            borderRadius: 8, // Less rounded, more rectangular
            backgroundColor: value === DateToggleType.MULTI_DAY ? "#bef264" : "#eee",
          },
        },
      ]}
      density="small"
      style={{
        borderRadius: 8, // Container also less rounded
      }}
    />
  );
};

export default DateToggleGroup;
