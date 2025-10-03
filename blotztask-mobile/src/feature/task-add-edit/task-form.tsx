// TaskForm.tsx
import React, { useState, useMemo } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import { mapDtoToFormTimeType } from "./util/time-type-mapper";
import DateSection from "./components/date-section/date-section";
import TimeSelectSingleDay from "./components/time-sections/time-select-single-day";
import TimeSelectRangeDay from "./components/time-sections/time-select-range-day";
import { isSameDay } from "date-fns";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { LabelSelect } from "./components/label-select";
import { FormDivider } from "./components/form-divider";

type TaskFormProps = {
  mode: "create" | "edit";
  defaultValues?: EditTaskItemDTO;
  onSubmit: (data: TaskFormField) => void;
};

const TaskForm = ({ mode, defaultValues, onSubmit }: TaskFormProps) => {
  const { title, description, timeType, startTime, endTime, labelId } = defaultValues || {};
  const mappedTimeType = mapDtoToFormTimeType(timeType);

  const methods = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: {
      title: title ?? "",
      description: description ?? "",
      labelId: labelId ?? null,
      timeType: mappedTimeType ?? null,
      startDate: startTime ?? null,
      startTime: startTime ?? null,
      endDate: endTime ?? null,
      endTime: endTime ?? null,
    },
  });

  const { handleSubmit, formState, control, setValue, watch } = methods;
  const { isValid, isSubmitting } = formState;

  const formTimeType = watch("timeType");

  // Compute defaultDateType once
  const defaultDateType = useMemo(() => {
    if (mappedTimeType === "single") return "1-day";
    if (mappedTimeType === "range" && startTime && endTime) {
      return isSameDay(startTime, endTime) ? "1-day" : "multi-day";
    }
    return undefined;
  }, []);

  // Lift activeTab and enableDate to TaskForm
  const [enableDate, setEnableDate] = useState(!!formTimeType);
  const [activeTab, setActiveTab] = useState<"1-day" | "multi-day" | undefined>(defaultDateType);

  return (
    <FormProvider {...methods}>
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

          {/* Description */}
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

          {/* Date Section */}
          <DateSection
            control={control}
            setValue={setValue}
            dateState={{ enableDate, setEnableDate }}
            activeTabState={{ activeTab, setActiveTab }} // pass down activeTab
          />

          <FormDivider />

          {/* Conditional Time Sections */}
          {enableDate && activeTab === "1-day" && <TimeSelectSingleDay />}
          {enableDate && activeTab === "multi-day" && <TimeSelectRangeDay />}
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
