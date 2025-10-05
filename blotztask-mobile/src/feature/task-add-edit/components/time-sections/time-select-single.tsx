import React from "react";
import { View, Text } from "react-native";
import { Control, Controller, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";
import { TimePicker12H } from "./time-picker-12h";

interface TimeSelectSingleProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
}

const TimeSelectSingle = ({ control, setValue }: TimeSelectSingleProps) => {
  return (
    <View className="items-center">
      <Text className="text-lg font-balooBold mb-4 text-gray-700">Single Time</Text>
      <Controller
        control={control}
        name="startTime"
        render={({ field: { value, onChange } }) => (
          <TimePicker12H
            value={value as Date | null}
            onChange={(time) => {
              onChange(time);
              // Set the same time for both start and end
              setValue("endTime", time);
            }}
          />
        )}
      />
    </View>
  );
};

export default TimeSelectSingle;
