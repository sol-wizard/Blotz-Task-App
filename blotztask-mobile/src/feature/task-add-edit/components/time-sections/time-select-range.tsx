import React from "react";
import { View, Text } from "react-native";
import { Control, Controller } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";
import { TimePicker12H } from "./time-picker-12h";

interface TimeSelectRangeProps {
  control: Control<TaskFormField>;
}

const TimeSelectRange = ({ control }: TimeSelectRangeProps) => {
  return (
    <View className="gap-6">
      {/* Start Time */}
      <View className="flex-row items-center gap-4">
        <Text className="text-lg font-balooBold text-gray-700">Start Time</Text>
        <Controller
          control={control}
          name="startTime"
          render={({ field: { value, onChange } }) => (
            <TimePicker12H value={value as Date | null} onChange={onChange} />
          )}
        />
      </View>

      {/* End Time */}
      <View className="flex-row items-center gap-4">
        <Text className="text-lg font-balooBold text-gray-700">End Time</Text>
        <Controller
          control={control}
          name="endTime"
          render={({ field: { value, onChange } }) => (
            <TimePicker12H value={value as Date | null} onChange={onChange} />
          )}
        />
      </View>
    </View>
  );
};

export default TimeSelectRange;
