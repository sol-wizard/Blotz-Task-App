import { TextInput, View, Text } from "react-native";
import { useState } from "react";
import { SubTask } from "../models/subtask";
import { zodResolver } from "@hookform/resolvers/zod";
import EditTaskFormField, { taskEditFormSchema } from "../services/breakdown-task-edit-form-schema";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { convertSubtaskTimeForm } from "../services/utils/convert-subtask-time-form";
import { CustomCheckbox } from "@/shared/components/ui/custom-checkbox";

export const BreakdownTaskCard = ({
  subTask,
  openAddSubtaskBottomSheet,
}: {
  subTask: SubTask;
  openAddSubtaskBottomSheet: (newSubtask: SubTask) => void;
}) => {
  const [isChecked, setIsChecked] = useState(false);

  const form = useForm<EditTaskFormField>({
    resolver: zodResolver(taskEditFormSchema),
    mode: "onBlur",
    defaultValues: {
      title: subTask.title,
    },
  });
  const handleCheckboxPress = async () => {
    const values = form.getValues();
    const newSubtask: SubTask = {
      title: values.title,
      duration: subTask.duration,
    };
    openAddSubtaskBottomSheet(newSubtask);
    setIsChecked((v) => !v);
  };

  return (
    <FormProvider {...form}>
      <View className="flex-row w-full items-center justify-between">
        <View className="flex-row items-center rounded-2xl bg-white mb-3 px-4 py-4 flex-1 border border-gray-300">
          <CustomCheckbox checked={isChecked} onPress={handleCheckboxPress} />

          <View className="flex-row justify-between flex-1 items-center">
            <Controller
              control={form.control}
              name="title"
              render={({ field: { value, onChange } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  style={{ fontSize: 16, fontWeight: "600" }}
                  multiline={true}
                  scrollEnabled={false}
                />
              )}
            />

            {subTask.duration && (
              <Text className="text-base text-primary ml-2">
                {convertSubtaskTimeForm(subTask.duration)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </FormProvider>
  );
};
