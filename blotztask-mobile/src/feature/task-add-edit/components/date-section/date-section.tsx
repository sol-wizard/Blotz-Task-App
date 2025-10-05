import { View, Text } from "react-native";
import React, { useState } from "react";
import { Checkbox } from "react-native-paper";
import { isSameDay } from "date-fns";
import DateToggleGroup, { DateToggleType } from "./date-toggle-group";
import { TaskFormField } from "../../models/task-form-schema";
import { Control, UseFormSetValue } from "react-hook-form";
import DateSelectSingleDay from "./date-select-single-day";
import DateSelectRangeDay from "./date-select-range-day";

interface DateSectionProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
}

const DateSection = ({
  control,
  setValue,
}: DateSectionProps) => {

  // Simple approach: check if existing dates span multiple days
  const getInitialDateToggle = () => {
    const defaultValues = control._defaultValues;
    const startDate = defaultValues?.startDate;
    const endDate = defaultValues?.endDate;
    
    // Only set to multi-day if both dates exist AND they're different days
    if (startDate && endDate && !isSameDay(startDate, endDate)) {
      return DateToggleType.MULTI_DAY;
    }
    
    // Default to single day in all other cases
    return DateToggleType.SINGLE_DAY;
  };

  const [dateToggle, setDateToggle] = useState<DateToggleType>(getInitialDateToggle());
  
  // Check if form has existing date data
  const hasExistingDates = () => {
    const defaultValues = control._defaultValues;
    const startDate = defaultValues?.startDate;
    const endDate = defaultValues?.endDate;
    
    return !!(startDate || endDate);
  };
  
  const [isExpanded, setIsExpanded] = useState(hasExistingDates());

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  return (
    <View className="flex-col gap-4 mb-8">
      <View className="flex-row items-center justify-between">

        <View className="flex-row gap-2 items-center">
          <View className="bg-blue-100 rounded-lg" style={{ transform: [{ scale: 0.7 }] }}>
            <Checkbox
              status={isExpanded ? "checked" : "unchecked"}
              onPress={handleToggleExpand}
              color="#B0D0FA"
            />
          </View>
          <Text className="font-balooBold text-3xl leading-normal">Date</Text>
        </View>

        <View className="flex-[0.75]">
          <DateToggleGroup
            value={dateToggle}
            onValueChange={setDateToggle}
          />
        </View>
      </View>

      {isExpanded && (
        <View className="mt-4">
          {dateToggle === DateToggleType.SINGLE_DAY ? (
            <DateSelectSingleDay
              control={control}
              setValue={setValue}
            />
          ) : (
            <DateSelectRangeDay
              control={control}
              setValue={setValue}
              nameStart="startDate"
              nameEnd="endDate"
            />
          )}
        </View>
      )}
    </View>
  );
};

export default DateSection;
