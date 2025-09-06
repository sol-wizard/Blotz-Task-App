import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { View, Text, TouchableOpacity } from "react-native";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

import { updateTaskItem } from "../../services/task-service";
import TaskFormField, { taskFormSchema } from "../../models/task-form-schema";
import { RepeatSelect } from "./fields/repeat-select";
import { LabelSelect } from "./fields/label-select";

export type EditTaskFormProps = {
  task: TaskDetailDTO;
  onSubmit: () => void;
  onCancel?: () => void;
};
export const EditTaskForm = ({ task, onSubmit, onCancel }: EditTaskFormProps) => {
  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      endTime: new Date(task.endTime),
      repeat: "none",
      labelId: task.label?.labelId ?? undefined,
    },
  });

  const {
    control,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const handleSubmit = form.handleSubmit(async (values: TaskFormField) => {
    const updatedTask = {
      id: task?.id ?? 0,
      title: values.title,
      description: values.description ?? "",
      endTime: values.endTime,
      isDone: task?.isDone,
      hasTime: !!values.endTime,
      repeat: values.repeat ?? "none",
      labelId: values.labelId,
    };
    try {
      await updateTaskItem(updatedTask);
    } catch (err) {
      console.error("updateTaskItem failed", err);
    }
    onSubmit();
  });

  return (
    <FormProvider {...form}>
      <View className="gap-3">
        <View className="mb-3">
          <FormTextInput
            control={control}
            name="title"
            placeholder="Task title"
            className="text-lg font-semibold rounded-2xl bg-slate-200 border-slate-200  border px-4 py-3 shadow-sm "
            inputProps={{
              textAlignVertical: "top",
              textAlign: "left",
              style: {
                paddingTop: 10,
                lineHeight: 20,
              },
            }}
          />
        </View>

        <View className="mb-3 ">
          <FormTextInput
            name="description"
            placeholder="Description..."
            className=" text-black  px-4 py-3 border bg-slate-200 border-slate-200  shadow-sm h-40 "
            control={control}
            inputProps={{
              multiline: true,
              numberOfLines: 5,
              textAlignVertical: "top",
              textAlign: "left",
            }}
          />
          {errors.description && (
            <Text className="text-red-500 text-xs">{errors.description.message}</Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <RepeatSelect control={control} />
          </View>
          <View className="flex-1">
            <LabelSelect control={control} />
          </View>
        </View>

        <View className="mt-2">
          <TouchableOpacity
            className={` rounded-2xl py-5 items-center mt-4 ${
              isValid ? "bg-black" : " bg-gray-200"
            }`}
            onPress={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            <Text className="text-white text-base font-semibold">
              {isSubmitting ? "saving..." : "Confirm"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="mt-3 items-center"
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text className="text-sm text-gray-500"> Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </FormProvider>
  );
};
