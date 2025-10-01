import { Control, Controller, UseFormResetField, UseFormSetValue } from "react-hook-form";
import { View, Text } from "react-native";
import { Checkbox, RadioButton } from "react-native-paper";
import { SingleTimeSelect } from "./single-time-select";
import { RangeTimeSelect } from "./range-time-select";
import { TaskFormField } from "../models/task-form-schema";

type TimeSectionProps = {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  resetField: UseFormResetField<TaskFormField>;
  enableTime: boolean;
  setEnableTime: (value: boolean) => void;
};

export const TimeSection = ({
  control,
  setValue,
  resetField,
  enableTime,
  setEnableTime,
}: TimeSectionProps) => {
  const clearTimeValues = () => {
    resetField("singleDate");
    resetField("singleTime");
    resetField("startDate");
    resetField("startTime");
    resetField("endDate");
    resetField("endTime");
  };

  const handleTimeToggle = () => {
    const newEnableTime = !enableTime;
    setEnableTime(newEnableTime);
    clearTimeValues();

    if (newEnableTime) {
      // Default to single when enabling time
      setValue("timeType", "single", { shouldValidate: true });
    } else {
      setValue("timeType", undefined, { shouldValidate: true });
    }
  };

  return (
    <View className="flex-col gap-4 mb-8">
      <View className="flex-row gap-2">
        <View className="bg-blue-100 rounded-lg" style={{ transform: [{ scale: 0.7 }] }}>
          <Checkbox
            status={enableTime ? "checked" : "unchecked"}
            onPress={handleTimeToggle}
            color="#B0D0FA"
          />
        </View>
        <Text className="font-balooBold text-3xl leading-normal">Time</Text>
      </View>
      {/* TODO: Show error messages when validation check fails */}
      {/* TODO: Disable timepickers when !enableTime */}

      <View className="mb-8">
        <Controller
          control={control}
          name="timeType"
          render={({ field: { onChange, value } }) => (
            <RadioButton.Group
              onValueChange={(newValue) => {
                onChange(newValue);
                clearTimeValues();
              }}
              value={enableTime ? (value ?? "") : ""}
            >
              <SingleTimeSelect control={control} setValue={setValue} enableTime={enableTime} />
              <RangeTimeSelect control={control} setValue={setValue} enableTime={enableTime} />
            </RadioButton.Group>
          )}
        />
      </View>
    </View>
  );
};
