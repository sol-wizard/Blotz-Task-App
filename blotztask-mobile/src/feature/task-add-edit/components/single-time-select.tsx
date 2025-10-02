import { SingleDateTimePicker } from "@/feature/task-add-edit/components/time-pickers/single-date-time-picker";
import { TaskFormField } from "@/feature/task-add-edit/models/task-form-schema";
import { Control, UseFormSetValue } from "react-hook-form";
import { View, Text } from "react-native";
import { RadioButton } from "react-native-paper";

type SingleTimeSelectProps = {
  control: Control<TaskFormField>;
  setValue: UseFormSetValue<TaskFormField>;
  enableTime: boolean;
};

export const SingleTimeSelect = ({ control, setValue, enableTime }: SingleTimeSelectProps) => {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className={`rounded-full p-1 ${
          enableTime ? "bg-blue-100" : "bg-gray-200"
        } flex justify-center items-center`}
        style={{ transform: [{ scale: 0.7 }] }}
      >
        <RadioButton
          value="single"
          disabled={!enableTime}
          color="#B0D0FA"
          uncheckedColor={enableTime ? "#B0D0FA" : "#A1A1A1"}
        />
      </View>
      <Text className={`font-baloo text-lg ${enableTime ? "text-gray-800" : "text-gray-400"}`}>
        Single Time
      </Text>
      <View>
        <SingleDateTimePicker control={control} setValue={setValue} />
      </View>
    </View>
  );
};
