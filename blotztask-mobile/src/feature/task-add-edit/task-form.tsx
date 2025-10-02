import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import { FormProvider, useForm } from "react-hook-form";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { mapDtoToFormTimeType } from "./util/time-type-mapper";
import { FormDivider } from "./components/form-divider";
import { TimeSection } from "./components/time-section";
import { LabelSelect } from "./components/label-select";

type TaskFormProps = {
  mode: "create" | "edit";
  defaultValues?: EditTaskItemDTO;
  onSubmit: (data: TaskFormField) => void;
};

const TaskForm = ({ mode, defaultValues, onSubmit }: TaskFormProps) => {
  const { title, description, timeType, startTime, endTime, labelId } = defaultValues || {};

  const mappedTimeType = mapDtoToFormTimeType(timeType);
  const isSingle = mappedTimeType === "single";
  const isRange = mappedTimeType === "range";

  const methods = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: {
      title: title ?? "",
      description: description ?? "",
      labelId: labelId ?? null,
      timeType: mappedTimeType ?? null,
      singleDate: isSingle ? (startTime ?? null) : null,
      singleTime: isSingle ? (startTime ?? null) : null,
      startDate: isRange ? (startTime ?? null) : null,
      startTime: isRange ? (startTime ?? null) : null,
      endDate: isRange ? (endTime ?? null) : null,
      endTime: isRange ? (endTime ?? null) : null,
    },
  });

  const { handleSubmit, formState, control, watch, setValue, resetField } = methods;
  const { isValid, isSubmitting } = formState;

  const formTimeType = watch("timeType");
  const [enableTime, setEnableTime] = useState(!!formTimeType);

  return (
    <FormProvider {...methods}>
      <View className="flex-1 relative">
        <ScrollView className="flex-col py-6 px-8" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Title Section */}
          <View className="mb-8 bg-gray-200">
            <FormTextInput
              name="title"
              placeholder="Title"
              control={control}
              className="font-balooBold text-5xl leading-normal"
            />
          </View>

          {/* Category Section */}
          <View className="mb-8">
            <Text className="font-balooBold text-3xl leading-normal">Category</Text>
            <LabelSelect control={control} />
          </View>

          <FormDivider />

          {/* Description Section */}
          <View className="mb-8">
            <Text className="font-balooBold text-3xl leading-normal">Description</Text>
            <FormTextInput
              name="description"
              placeholder="Add details about this task (optional)"
              control={control}
              className="bg-gray-200 font-baloo text-lg"
            />
          </View>

          <FormDivider />

          {/* Time Section */}
          <TimeSection
            control={control}
            setValue={setValue}
            resetField={resetField}
            enableTime={enableTime}
            setEnableTime={setEnableTime}
          />
        </ScrollView>

        {/* Submit Button */}
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
