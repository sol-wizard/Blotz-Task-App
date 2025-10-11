import React from "react";
import { View, Text } from "react-native";
import { Control, Controller } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";
import { TimePicker12H } from "./time-picker-12h";

interface TimeSelectRangeProps {
  control: Control<TaskFormField>;
}

interface TimeInputProps {
  label: string;
  name: keyof TaskFormField;
  control: Control<TaskFormField>;
}

const TimeInput: React.FC<TimeInputProps> = ({ label, name, control }) => {
  return (
    <View className="flex-row items-center gap-4">
      <Text className="text-xl font-baloo w-[100px]">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <TimePicker12H value={value as Date | null} onChange={onChange} />
        )}
      />
    </View>
  );
};
const TimeSelectRange = ({ control }: TimeSelectRangeProps) => {
  return (
    <View className="gap-2">
      {/* Start Time */}
      <TimeInput label="Start Time" name="startTime" control={control} />

      {/* End Time */}
      <TimeInput label="End Time" name="endTime" control={control} />
    </View>
  );
};

export default TimeSelectRange;
