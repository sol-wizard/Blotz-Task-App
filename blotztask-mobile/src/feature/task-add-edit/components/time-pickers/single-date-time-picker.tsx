import { View } from "react-native";
import DatePicker from "./date-picker";
import { Controller, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";
import { TimePicker } from "./time-picker";

export const SingleDateTimePicker = ({
  control,
  setValue,
}: {
  control: any;
  setValue: UseFormSetValue<TaskFormField>;
}) => {
  return (
    <View className="flex-row items-center">
      <View>
        <Controller
          control={control}
          name="singleDate"
          render={({ field: { value, onChange } }) => (
            <DatePicker
              value={value as Date | undefined}
              onChange={(date) => {
                onChange(date);
                if (date) {
                  const defaultSingleTime = new Date(date);
                  defaultSingleTime.setHours(0, 0, 0, 0);
                  setValue("singleDate", defaultSingleTime, { shouldValidate: true });
                }
              }}
            />
          )}
        />
      </View>
      <View>
        <Controller
          control={control}
          name="singleTime"
          render={({ field: { value, onChange } }) => (
            <TimePicker value={value as Date | undefined} onChange={onChange} />
          )}
        />
      </View>
    </View>
  );
};
