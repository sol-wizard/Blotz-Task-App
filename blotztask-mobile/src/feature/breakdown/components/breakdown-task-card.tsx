import { TextInput, View, Text } from "react-native";
import { Checkbox } from "react-native-paper";
import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "@/shared/constants/colors";
import { SubTask } from "../models/subtask";
import { zodResolver } from "@hookform/resolvers/zod";
import EditTaskFormField, {
  taskEditFormSchema,
} from "../services/breakdown-task-edit-form-schema";
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
} from "react-hook-form";

export const BreakdownTaskCard = ({
  parentTaskId,
  subTask,
}: {
  parentTaskId: string;
  subTask: SubTask;
}) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleAddSubTask: SubmitHandler<EditTaskFormField> = ({ title }) => {
    setIsChecked((prev) => !prev);
    console.log("sub task added!", title, "parentTaskId:", parentTaskId);
  };

  const form = useForm<EditTaskFormField>({
    resolver: zodResolver(taskEditFormSchema),
    mode: "onBlur",
    defaultValues: {
      title: subTask.title,
    },
  });

  return (
    <FormProvider {...form}>
      <View className="flex-row w-full items-center justify-between">
        <View className="flex-row items-center rounded-2xl bg-white mb-3 px-4 py-3 flex-1 border border-gray-300">
          <Checkbox
            status={isChecked ? "checked" : "unchecked"}
            onPress={form.handleSubmit(handleAddSubTask)}
          />
          <View className="w-[5px] bg-gray-300 h-full min-h-[40px] mr-4 rounded-md" />
          <View className="flex-col">
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

            <View className="flex-row my-1">
              <MaterialIcons name="schedule" size={20} color={COLORS.primary} />
              {subTask.duration && (
                <Text className="text-base text-primary ml-2">
                  {subTask.duration}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </FormProvider>
  );
};
