import React from "react";
import { SegmentedButtons } from "react-native-paper";

export enum TimeToggleType {
  SINGLE_TIME = "single-time",
  TIME_RANGE = "time-range",
}

interface TimeToggleGroupProps {
  value: TimeToggleType;
  onValueChange: (value: TimeToggleType) => void;
}

const TimeToggleGroup = ({ value, onValueChange }: TimeToggleGroupProps) => {
  return (
    <SegmentedButtons
      value={value}
      onValueChange={onValueChange}
      buttons={[
        {
          value: TimeToggleType.SINGLE_TIME,
          label: "Single",
          style: {
            borderRadius: 8, // Less rounded, more rectangular
            backgroundColor: value === TimeToggleType.SINGLE_TIME ? "#bef264" : "white",
            borderColor: "#d1d5db",
          },
          labelStyle: {
            fontFamily: "BalooRegular",
            fontSize: 16,
            lineHeight: 22,
          },
        },
        {
          value: TimeToggleType.TIME_RANGE,
          label: "Range",
          style: {
            borderRadius: 8, // Less rounded, more rectangular
            backgroundColor: value === TimeToggleType.TIME_RANGE ? "#bef264" : "white",
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

export default TimeToggleGroup;
