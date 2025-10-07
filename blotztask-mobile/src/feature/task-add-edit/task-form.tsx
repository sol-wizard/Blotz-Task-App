import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import DateSection from "./components/date-section/date-section";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { LabelSelect } from "./components/label-select";
import { FormDivider } from "./components/form-divider";
import TimeSection from "./components/time-sections/time-section";

type TaskFormProps = {
  mode: "create" | "edit";
  defaultValues?: EditTaskItemDTO;
  onSubmit: (data: TaskFormField) => void;
};

const TaskForm = ({ mode, defaultValues, onSubmit }: TaskFormProps) => {
  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      labelId: defaultValues?.labelId ?? null,
      startDate: defaultValues?.startTime ?? null,
      startTime: defaultValues?.startTime ?? null,
      endDate: defaultValues?.endTime ?? null,
      endTime: defaultValues?.endTime ?? null,
    },
  });

  const { handleSubmit, formState, control, setValue } = form;
  const { isValid, isSubmitting } = formState;

  return (
    <FormProvider {...form}>
      <View className="flex-1 relative">
        <ScrollView className="flex-col py-6 px-8" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Title */}
          <View className="mb-8 bg-gray-200">
            <FormTextInput
              name="title"
              placeholder="Title"
              control={control}
              className="font-balooBold text-5xl leading-normal"
            />
          </View>

          {/* Category */}
          <View className="mb-8">
            <Text className="font-balooBold text-3xl leading-normal">Category</Text>
            <LabelSelect control={control} />
          </View>

          <FormDivider />

          {/* Description Section */}
          {/* TODO: Remove description section for now and waiting for design */}
          {/* <View className="mb-8">
            <Text className="font-balooBold text-3xl leading-normal">Description</Text>
            <FormTextInput
              name="description"
              placeholder="Add details about this task (optional)"
              control={control}
              className="bg-gray-200 font-baloo text-lg"
            />
          </View> */}

          <FormDivider />

          {/* Date Section */}
          <DateSection control={control} setValue={setValue} />

          <FormDivider />

          <TimeSection control={control} setValue={setValue} />
        </ScrollView>

        {/* Submit */}
        <View className="px-8 py-6">
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isSubmitting}
            className={`w-full py-4 rounded-lg items-center justify-center ${
              !isValid || isSubmitting ? "bg-gray-300" : "bg-lime-300"
            }`}
          >
            <Text className="font-balooBold text-lg text-black">
              {mode === "create" ? "Create Task" : "Update Task"}
            </Text>
          </Pressable>
        </View>
      </View>
    </FormProvider>
  );
};

export default TaskForm;
