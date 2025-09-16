import { View } from "react-native";
import { DateTimeSelector } from "./date-time-selector";
import { Controller } from "react-hook-form";

export const StartEndDateTimePicker = ({ control }: { control: any }) => {
  return (
    <View className="flex-row justify-between">
      <Controller
        control={control}
        name="startTime"
        render={({ field: { value, onChange } }) => {
          return (
            <DateTimeSelector
              defaultValue={value}
              changeDateTime={onChange}
              defaultHours={0}
              defaultMinutes={0}
            />
          );
        }}
      />
      <Controller
        control={control}
        name="endTime"
        render={({ field: { value, onChange } }) => {
          return (
            <DateTimeSelector
              defaultValue={value}
              changeDateTime={onChange}
              defaultHours={23}
              defaultMinutes={59}
            />
          );
        }}
      />
    </View>
  );
};
