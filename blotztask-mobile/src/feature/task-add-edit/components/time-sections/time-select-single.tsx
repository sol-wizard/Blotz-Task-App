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
    <View className="flex-row items-center gap-4">
      <Text className="text-xl font-baloo w-[100px]">Single Time</Text>
      <Controller
        control={control}
        name="startTime"
        render={({ field: { value, onChange } }) => (
          <TimePicker12H
            value={value as Date | null}
            onChange={(time) => {
              onChange(time);
              // Set the same time for both start and end
              setValue("endTime", time, { shouldValidate: true });
            }}
          />
        )}
      />
    </View>
  );
};

export default TimeSelectSingle;
