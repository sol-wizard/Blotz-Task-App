import { View, Text } from "react-native";
import DatePicker from "./date-picker";
import { TimePicker } from "./time-picker";
import { Controller, Control, UseFormSetValue } from "react-hook-form";
import { TaskFormField } from "../../models/task-form-schema";

interface StartEndDateTimePickerProps {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  textClassName?: string;
}

export const StartEndDateTimePicker = ({
  control,
  setValue,
  textClassName,
}: StartEndDateTimePickerProps) => {
  return (
    <View className="flex-col">
      <View className="flex-row items-center">
        <Text className={textClassName}>Start Time</Text>
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

      <View className="flex-row items-center">
        <Text className={textClassName}>End Time</Text>
        <View>
          <Controller
            control={control}
            name="endDate"
            render={({ field: { value, onChange } }) => (
              <DatePicker
                value={value as Date | undefined}
                onChange={(date) => {
                  onChange(date);
                  if (date) {
                    const defaultEndTime = new Date(date);
                    defaultEndTime.setHours(23, 59, 0, 0);
                    setValue("endTime", defaultEndTime, { shouldValidate: true });
                  }
                }}
              />
            )}
          />
        </View>
        <View>
          <Controller
            control={control}
            name="endTime"
            render={({ field: { value, onChange } }) => (
              <TimePicker value={value as Date | undefined} onChange={onChange} />
            )}
          />
        </View>
      </View>
    </View>
  );
};
