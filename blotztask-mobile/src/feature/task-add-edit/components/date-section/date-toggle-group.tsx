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
          label: "Single",
          style: {
            borderRadius: 8, // Less rounded, more rectangular
            backgroundColor: value === DateToggleType.SINGLE_DAY ? "#bef264" : "white",
            borderColor: "#d1d5db",
          },
          labelStyle: {
            fontFamily: "BalooRegular",
            fontSize: 16,
            lineHeight: 22,
          },
        },
        {
          value: DateToggleType.MULTI_DAY,
          label: "Range",
          style: {
            borderRadius: 8, // Less rounded, more rectangular
            backgroundColor: value === DateToggleType.MULTI_DAY ? "#bef264" : "white",
            borderColor: "#d1d5db",
          },
          labelStyle: {
            fontFamily: "BalooRegular",
            fontSize: 16,
            lineHeight: 22,
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
