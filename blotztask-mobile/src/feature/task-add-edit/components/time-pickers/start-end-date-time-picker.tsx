import { View, Text } from "react-native";
import DatePicker from "./date-picker";
import { TimePicker } from "./time-picker";
import { Controller, Control, UseFormSetValue, useWatch } from "react-hook-form";
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
  const startTime = useWatch({ control, name: "startTime" });
  const endTime = useWatch({ control, name: "endTime" });

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
                value={value as Date | null}
                onChange={(date) => {
                  onChange(date);
                  if (date) {
                    const defaultStartTime = new Date(date);
                    if (!startTime) {
                      defaultStartTime.setHours(0, 0, 0, 0);
                      setValue("startTime", defaultStartTime, { shouldValidate: true });
                    }
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
              <TimePicker value={value as Date | null} onChange={onChange} />
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
                value={value as Date | null}
                onChange={(date) => {
                  onChange(date);
                  if (date) {
                    const defaultEndTime = new Date(date);
                    if (!endTime) {
                      defaultEndTime.setHours(23, 59, 0, 0);
                      setValue("endTime", defaultEndTime, { shouldValidate: true });
                    }
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
              <TimePicker value={value as Date | null} onChange={onChange} />
            )}
          />
        </View>
      </View>
    </View>
  );
};
