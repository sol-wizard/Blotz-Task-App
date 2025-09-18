import { View } from "react-native";
import DatePicker from "./date-picker";
import { TimePicker } from "./time-picker";
import { Controller } from "react-hook-form";

export const StartEndDateTimePicker = ({ control }: { control: any }) => {
  return (
    <>
      <View className="flex-row justify-between gap-3">
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
            name="startTimeOnly"
            render={({ field: { value, onChange } }) => (
              <TimePicker defaultValue={value as Date | undefined} onChange={onChange} />
            )}
          />
        </View>
      </View>
      <View className="flex-row justify-between gap-3 mt-3">
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
            name="endTimeOnly"
            render={({ field: { value, onChange } }) => (
              <TimePicker defaultValue={value as Date | undefined} onChange={onChange} />
            )}
          />
        </View>
      </View>
    </>
  );
};
