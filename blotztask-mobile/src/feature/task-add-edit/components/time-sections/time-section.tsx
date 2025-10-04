import { View, Text } from "react-native";
import React, { useState } from "react";
import { Checkbox } from "react-native-paper";
import TimeSelectSingleDay from "./time-select-single-day";
import TimeSelectRangeDay from "./time-select-range-day";
import { resetDefaultTimeValues } from "../../task-form";
import { Control, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";

interface TimeSectionProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  enableDate: boolean;
  activeTab: "1-day" | "multi-day" | undefined;
}

const TimeSection = ({ control, setValue, enableDate, activeTab }: TimeSectionProps) => {
  const [enableTime, setEnableTime] = useState(false);
  const handleTimeToggle = () => {
    const newEnableTime = !enableTime;
    setEnableTime(newEnableTime);
    resetDefaultTimeValues(new Date(), new Date(), setValue);
  };
  return (
    <View>
      <View className="flex-row gap-2">
        <View className="bg-blue-100 rounded-lg" style={{ transform: [{ scale: 0.7 }] }}>
          <Checkbox
            status={enableTime ? "checked" : "unchecked"}
            onPress={handleTimeToggle}
            color="#B0D0FA"
            disabled={!enableDate}
          />
        </View>
        <Text className="font-balooBold text-3xl leading-normal">Time</Text>
      </View>
      {/* Conditional Time Sections */}
      {enableTime && enableDate && activeTab === "1-day" && <TimeSelectSingleDay />}
      {enableTime && enableDate && activeTab === "multi-day" && <TimeSelectRangeDay />}
    </View>
  );
};

export default TimeSection;
