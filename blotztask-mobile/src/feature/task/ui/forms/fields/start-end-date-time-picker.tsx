import { View } from "react-native";
import DatePicker from "./date-picker";
import { TimePicker } from "./time-picker";
import { Controller, useWatch } from "react-hook-form";

export const StartEndDateTimePicker = ({ control }: { control: any }) => {
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  return (
    <View className="flex-col justify-between">
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Controller
            control={control}
            name="startDate"
            render={({ field: { value, onChange } }) => (
              <DatePicker value={value as Date | undefined} onChange={onChange} />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="startTime"
            render={({ field: { value, onChange } }) => (
              <TimePicker
                type="start"
                hasDate={!!startDate}
                defaultValue={value as Date | undefined}
                onChange={onChange}
              />
            )}
          />
        </View>
      </View>
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Controller
            control={control}
            name="endDate"
            render={({ field: { value, onChange } }) => (
              <DatePicker value={value as Date | undefined} onChange={onChange} />
            )}
          />
        </View>
        <View className="flex-1">
          <Controller
            control={control}
            name="endTime"
            render={({ field: { value, onChange } }) => (
              <TimePicker
                type="end"
                hasDate={!!endDate}
                defaultValue={value as Date | undefined}
                onChange={onChange}
              />
            )}
          />
        </View>
      </View>
    </View>
  );
};
