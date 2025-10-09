import { View, Text, Pressable } from "react-native";
import React, { useState } from "react";
import { Control, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";
import TimeToggleGroup, { TimeToggleType } from "./time-toggle-group";
import TimeSelectSingle from "./time-select-single";
import TimeSelectRange from "./time-select-range";
import { EditTaskItemDTO } from "../../models/edit-task-item-dto";
import { MaterialIcons } from "@expo/vector-icons";
import { isRangeTime } from "../../util/date-time-helpers";

interface TimeSectionProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  dto?: EditTaskItemDTO;
  isMultiDayTask?: boolean;
}

const TimeSection = ({ control, setValue, dto, isMultiDayTask = false }: TimeSectionProps) => {
  // Determine initial time toggle based on existing form values
  const getInitialTimeToggle = () => {
    const startTime = dto?.startTime;
    const endTime = dto?.endTime;

    // If both times exist and they're different (down to the minute), it's a time range
    if (isRangeTime(startTime ?? null, endTime ?? null)) {
      return TimeToggleType.TIME_RANGE;
    }

    // Default to single time in all other cases
    return TimeToggleType.SINGLE_TIME;
  };

  const [isTimeExpanded, setIsTimeExpanded] = useState(!isMultiDayTask);
  const [timeToggle, setTimeToggle] = useState<TimeToggleType>(getInitialTimeToggle());

  const handleTimeToggle = () => {
    if (isMultiDayTask) return;
    const newIsTimeExpanded = !isTimeExpanded;
    setIsTimeExpanded(newIsTimeExpanded);
  };

  return (
    <View
      className="flex-col gap-4 mb-8 "
      style={{ opacity: isMultiDayTask ? 0.5 : 1, pointerEvents: isMultiDayTask ? "none" : "auto" }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-2 items-center">
          <Pressable onPress={handleTimeToggle} className="p-2">
            <MaterialIcons
              name={isTimeExpanded ? "expand-less" : "expand-more"}
              size={24}
              color="#1E40AF"
            />
          </Pressable>
          <Text className="font-balooBold text-3xl leading-normal">Time</Text>
        </View>

        {/* Time Toggle */}
        <View className="flex-[0.75]">
          <TimeToggleGroup value={timeToggle} onValueChange={setTimeToggle} />
        </View>
      </View>
      {isTimeExpanded && !isMultiDayTask && (
        <View className="mt-4">
          {timeToggle === TimeToggleType.SINGLE_TIME ? (
            <TimeSelectSingle control={control} setValue={setValue} />
          ) : (
            <TimeSelectRange control={control} />
          )}
        </View>
      )}
    </View>
  );
};

export default TimeSection;
