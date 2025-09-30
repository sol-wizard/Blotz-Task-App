import { View } from "react-native";
import DatePicker from "./date-picker";
import { TimePicker } from "./time-picker";
import { Controller, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";

export const SingleDateTimePicker = ({
  control,
  setValue,
}: {
  control: any;
  setValue: UseFormSetValue<TaskFormField>;
}) => {
  return (
    <View className="flex-col">
      <View>
        <Controller
          control={control}
          name="startDate"
          render={({ field: { value, onChange } }) => (
            <DatePicker
              value={value as Date | undefined}
              onChange={(date) => {
                onChange(date);
                if (date) {
                  const defaultStartTime = new Date(date);
                  defaultStartTime.setHours(0, 0, 0, 0);
                  setValue("startTime", defaultStartTime, { shouldValidate: true });
                }
              }}
            />
          )}
        />
      </View>
      <View>
        <Controller
          control={control}
          name="startTime"
          render={({ field: { value, onChange } }) => (
            <TimePicker value={value as Date | undefined} onChange={onChange} />
          )}
        />
      </View>
    </View>
  );
};
