import { View, Text, Pressable } from "react-native";
import React, { useState } from "react";
import { isSameDay } from "date-fns";
import DateToggleGroup, { DateToggleType } from "./date-toggle-group";
import { TaskFormField } from "../../models/task-form-schema";
import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import DateSelectSingleDay from "./date-select-single-day";
import DateSelectRangeDay from "./date-select-range-day";
import { EditTaskItemDTO } from "../../models/edit-task-item-dto";
import { MaterialIcons } from "@expo/vector-icons";

const getDisplayDates = (
  startDate: Date | null,
  endDate: Date | null,
  dateToggle: DateToggleType,
) => {
  let displayStartDate: Date | null = null;
  let displayEndDate: Date | null = null;

  if (dateToggle === DateToggleType.SINGLE_DAY) {
    if (startDate && endDate && isSameDay(startDate, endDate)) {
      displayStartDate = startDate;
    } else {
      displayStartDate = null;
    }
    displayEndDate = null;
  } else {
    if (startDate && endDate && isSameDay(startDate, endDate)) {
      displayStartDate = null;
      displayEndDate = null;
    } else {
      displayStartDate = startDate || null;
      displayEndDate = endDate && startDate && !isSameDay(startDate, endDate) ? endDate : null;
    }
  }

  return { displayStartDate, displayEndDate };
};

interface DateSectionProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  dto?: EditTaskItemDTO;
}

const DateSection = ({ control, setValue, dto }: DateSectionProps) => {
  // Simple approach: check if existing dates span multiple days
  const getInitialDateToggle = () => {
    const startTime = dto?.startTime;
    const endTime = dto?.endTime;

    // Only set to multi-day if both dates exist AND they're different days
    if (startTime && endTime && !isSameDay(startTime, endTime)) {
      return DateToggleType.MULTI_DAY;
    }

    // Default to single day in all other cases
    return DateToggleType.SINGLE_DAY;
  };

  const [dateToggle, setDateToggle] = useState<DateToggleType>(getInitialDateToggle());
  const [isExpanded, setIsExpanded] = useState(!!dto?.timeType);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  const { displayStartDate, displayEndDate } = getDisplayDates(startDate, endDate, dateToggle);

  return (
    <View className="flex-col gap-4 mb-8">
      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-2 items-center">
          <Pressable onPress={handleToggleExpand} className="p-2">
            <MaterialIcons
              name={isExpanded ? "expand-less" : "expand-more"}
              size={24}
              color="#1E40AF"
            />
          </Pressable>
          <Text className="font-balooBold text-3xl leading-normal">Date</Text>
        </View>

        <View className="flex-[0.75]">
          <DateToggleGroup value={dateToggle} onValueChange={setDateToggle} />
        </View>
      </View>

      {isExpanded && (
        <View className="mt-4">
          {dateToggle === DateToggleType.SINGLE_DAY ? (
            <DateSelectSingleDay
              control={control}
              setValue={setValue}
              nameStart="startDate"
              displayDate={displayStartDate}
            />
          ) : (
            <DateSelectRangeDay
              control={control}
              nameStart="startDate"
              nameEnd="endDate"
              displayStartDate={displayStartDate}
              displayEndDate={displayEndDate}
            />
          )}
        </View>
      )}
    </View>
  );
};

export default DateSection;
