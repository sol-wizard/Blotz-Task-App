import { StartEndDateTimePicker } from "@/feature/task-add-edit/components/time-pickers/start-end-date-time-picker";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";
import { Control, UseFormSetValue } from "react-hook-form";
import { View, Text } from "react-native";
import { RadioButton } from "react-native-paper";

type RangeTimeSelectProps = {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  enableTime: boolean;
};

export const RangeTimeSelect = ({ control, setValue, enableTime }: RangeTimeSelectProps) => {
  return (
    <View className="flex-col">
      <View className="flex-row items-center gap-2">
        <View
          className={`rounded-full p-1 ${
            enableTime ? "bg-blue-100" : "bg-gray-200"
          } flex justify-center items-center`}
          style={{ transform: [{ scale: 0.7 }] }}
        >
          <RadioButton
            value="range"
            disabled={!enableTime}
            color="#B0D0FA"
            uncheckedColor={enableTime ? "#B0D0FA" : "#A1A1A1"}
          />
        </View>
        <Text className={`font-baloo text-lg ${enableTime ? "text-black" : "text-gray-400"}`}>
          Time Range
        </Text>
      </View>

      <View>
        <StartEndDateTimePicker
          control={control}
          setValue={setValue}
          textClassName={`mr-4 font-baloo text-lg ${enableTime ? "text-black" : "text-gray-400"}`}
        />
      </View>
    </View>
  );
};
