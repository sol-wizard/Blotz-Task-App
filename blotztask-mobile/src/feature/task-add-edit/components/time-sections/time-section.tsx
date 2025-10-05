import { View, Text } from "react-native";
import React, { useState } from "react";
import { Checkbox } from "react-native-paper";
import { resetDefaultTimeValues } from "../../task-form";
import { Control, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";
import { isSameDay } from "date-fns";
import TimeToggleGroup, { TimeToggleType } from "./time-toggle-group";
import TimeSelectSingle from "./time-select-single";
import TimeSelectRange from "./time-select-range";

interface TimeSectionProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
}

const TimeSection = ({ control, setValue }: TimeSectionProps) => {
  const [isTimeExpanded, setIsTimeExpanded] = useState(false);
  const [timeToggle, setTimeToggle] = useState<TimeToggleType>(TimeToggleType.SINGLE_TIME);
  
  //Time is disable for multi-day task
  const isMultiDayTask = () => {
    const formValues = control._formValues;
    const startDate = formValues?.startDate;
    const endDate = formValues?.endDate;
    
    // Only disable if both dates exist AND they're different days
    return startDate && endDate && !isSameDay(startDate, endDate);
  };
  
  // Hide time section completely for multi-day tasks
  if (isMultiDayTask()) {
    return null;
  }
  
  const handleTimeToggle = () => {
    const newIsTimeExpanded = !isTimeExpanded;
    setIsTimeExpanded(newIsTimeExpanded);
    resetDefaultTimeValues(new Date(), new Date(), setValue);
  };
  
  return (
    <View className="flex-col gap-4 mb-8">
      <View className="flex-row items-center justify-between">

        <View className="flex-row gap-2 items-center">
          <View className="bg-blue-100 rounded-lg" style={{ transform: [{ scale: 0.7 }] }}>
          <Checkbox
            status={isTimeExpanded ? "checked" : "unchecked"}
            onPress={handleTimeToggle}
            color="#B0D0FA"
          />
          </View>
          <Text className="font-balooBold text-3xl leading-normal">Time</Text>
        </View>

        {isTimeExpanded && (
          <View className="flex-[0.75]">
            <TimeToggleGroup
              value={timeToggle}
              onValueChange={setTimeToggle}
            />
          </View>
        )}
      </View>

      {isTimeExpanded && (
        <View className="mt-4">
          {timeToggle === TimeToggleType.SINGLE_TIME ? (
            <TimeSelectSingle
              control={control}
              setValue={setValue}
            />
          ) : (
            <TimeSelectRange
              control={control}
              setValue={setValue}
            />
          )}
        </View>
      )}
    </View>
  );
};

export default TimeSection;
