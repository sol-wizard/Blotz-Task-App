import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskItemDTO } from "../models/edit-task-item-dto";
import { TaskFormField, taskFormSchema } from "../models/task-form-schema";
import { FormProvider, useForm } from "react-hook-form";
import { useSelectedDayTaskStore } from "../stores/selectedday-task-store";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { RepeatSelect } from "../components/form/repeat-select";
import { LabelSelect } from "../components/form/label-select";
import { zodResolver } from "@hookform/resolvers/zod";
import { View, Text, TouchableOpacity } from "react-native";

export type EditTaskFormProps = {
  task: TaskDetailDTO;
  onClose: () => void;
};

export const EditTaskForm = ({ task, onClose }: EditTaskFormProps) => {
  const defaultValues: EditTaskItemDTO = {
    title: task.title,
    description: task.description ?? "",
    startTime: task.startTime ? new Date(task.startTime) : undefined,
    endTime: task.endTime ? new Date(task.endTime) : undefined,
    repeat: task.repeat ?? "none",
    labelId: task.label?.labelId ?? undefined,
    isDone: task.isDone,
    id: task.id,
  };
  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: defaultValues,
  });

  const {
    control,
    formState: { errors, isValid, isSubmitting },
  } = form;
  const { saveEditedTask } = useSelectedDayTaskStore();

  const handleSubmit = form.handleSubmit(async (values: TaskFormField) => {
    const updatedTask: EditTaskItemDTO = {
      id: task?.id ?? 0,
      title: values.title,
      description: values.description ?? "",
      startTime: values.startTime,
      endTime: values.endTime,
      isDone: task?.isDone,
      repeat: values.repeat ?? "none",
      labelId: values.labelId ?? undefined,
    };
    await saveEditedTask(updatedTask);
    onClose();
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
          <TouchableOpacity className="mt-3 items-center" onPress={onClose} disabled={isSubmitting}>
            <Text className="text-sm text-gray-500"> Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </FormProvider>
  );
};
