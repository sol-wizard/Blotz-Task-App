import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { FormProvider, useForm, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import { mapDtoToFormTimeType } from "./util/time-type-mapper";
import DateSection from "./components/date-section/date-section";
// import { isSameDay } from "date-fns";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { LabelSelect } from "./components/label-select";
import { FormDivider } from "./components/form-divider";
// import TimeSection from "./components/time-sections/time-section";

type TaskFormProps = {
  mode: "create" | "edit";
  defaultValues?: EditTaskItemDTO;
  onSubmit: (data: TaskFormField) => void;
};

export const clearDateValues = (setValue: UseFormSetValue<TaskFormField>) => {
  setValue("startDate", null, { shouldValidate: true });
  setValue("startTime", null, { shouldValidate: true });
  setValue("endDate", null, { shouldValidate: true });
  setValue("endTime", null, { shouldValidate: true });
};

export const resetDefaultTimeValues = (
  start: Date,
  end: Date,
  setValue: UseFormSetValue<TaskFormField>,
) => {
  const startTime = new Date(start);
  const endTime = new Date(end);
  startTime.setHours(0, 0, 0, 0);
  endTime.setHours(23, 59, 0, 0);
  setValue("startTime", startTime, { shouldValidate: true });
  setValue("endTime", endTime, { shouldValidate: true });
};

const TaskForm = ({ mode, defaultValues, onSubmit }: TaskFormProps) => {
  const mappedTimeType = mapDtoToFormTimeType(defaultValues?.timeType);

  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: {
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      labelId: defaultValues?.labelId ?? null,
      timeType: mappedTimeType ?? null,
      startDate: mappedTimeType === "range" ? (defaultValues?.startTime ?? null) : null,
      startTime: mappedTimeType === "range" ? (defaultValues?.startTime ?? null) : null,
      endDate: mappedTimeType === "range" ? (defaultValues?.endTime ?? null) : null,
      endTime: mappedTimeType === "range" ? (defaultValues?.endTime ?? null) : null,
    },
  });


  const { handleSubmit, formState, control, watch, setValue } = form;
  const { isValid, isSubmitting } = formState;

  const formTimeType = watch("timeType");

  // const defaultDateType = useMemo(() => {
  //   if (mappedTimeType === "single") return "1-day";
  //   if (mappedTimeType === "range" && startTime && endTime) {
  //     return isSameDay(startTime, endTime) ? "1-day" : "multi-day";
  //   }
  //   return undefined;
  // }, []);


  useEffect(() => {
    console.log("TaskForm - Form State:", {
      isValid,
      isSubmitting,
      formTimeType,
      values: form.getValues(),
    });
  }, [formTimeType, isSubmitting, isValid, form]);

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
          <DateSection
            control={control}
            setValue={setValue}
          />

          <FormDivider />

          {/* <TimeSection
            control={control}
            setValue={setValue}
            enableDate={enableDate}
            activeTab={activeTab}
          /> */}
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
