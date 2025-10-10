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
          label: "Single Time",
          style: {
            borderRadius: 8, // Less rounded, more rectangular
            backgroundColor: value === TimeToggleType.SINGLE_TIME ? "#bef264" : "#eee",
          },
        },
        {
          value: TimeToggleType.TIME_RANGE,
          label: "Time Range",
          style: {
            borderRadius: 8, // Less rounded, more rectangular
            backgroundColor: value === TimeToggleType.TIME_RANGE ? "#bef264" : "#eee",
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
