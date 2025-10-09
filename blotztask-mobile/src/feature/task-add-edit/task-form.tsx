import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import DateSection from "./components/date-section/date-section";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { LabelSelect } from "./components/label-select";
import { FormDivider } from "./components/form-divider";
import TimeSection from "./components/time-sections/time-section";
import { isMultiDay } from "./util/date-time-helpers";

type TaskFormProps =
  | {
      mode: "create";
      dto?: undefined;
      onSubmit: (data: TaskFormField) => void;
    }
  | {
      mode: "edit";
      dto: EditTaskItemDTO;
      onSubmit: (data: TaskFormField) => void;
    };

const TaskForm = ({ mode, dto, onSubmit }: TaskFormProps) => {
  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: {
      title: dto?.title ?? "",
      description: dto?.description ?? "",
      labelId: dto?.labelId ?? null,
      startDate: dto?.startTime ?? null,
      startTime: dto?.startTime ?? null,
      endDate: dto?.endTime ?? null,
      endTime: dto?.endTime ?? null,
    },
  });

  const { handleSubmit, formState, control, setValue } = form;
  const { isValid, isSubmitting } = formState;

  const [isFloatingTask, setIsFloatingTask] = useState(() => {
    if (mode === "create") return false; // Default to non-floating task creation
    return !dto.timeType; // Floating if editing task timeType is undefined
  });

  // When submitting, clear dates/times if floating
  const handleFormSubmit = (data: TaskFormField) => {
    if (isFloatingTask) {
      onSubmit({
        ...data,
        startDate: null,
        startTime: null,
        endDate: null,
        endTime: null,
      });
    } else {
      onSubmit(data);
    }
  };

  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  const allValues = useWatch({ control });

  useEffect(() => {
    console.log("Current form values:", allValues);
  }, [allValues]);

  const isMultiDayTask = isMultiDay(startDate, endDate);

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

          {/* <FormDivider /> */}

          <Pressable
            onPress={() => setIsFloatingTask((prev) => !prev)}
            className={`w-full py-3 mb-6 rounded-lg items-center justify-center ${
              isFloatingTask ? "bg-blue-400" : "bg-lime-300"
            }`}
          >
            <Text className="font-balooBold text-lg text-black">
              {isFloatingTask ? "No Datetime Task enabled" : "Enable No Datetime Task"}
            </Text>
          </Pressable>

          <FormDivider />

          {!isFloatingTask && (
            <>
              {/* Date Section */}
              <DateSection
                control={control}
                setValue={setValue}
                dto={dto}
                startDate={startDate} // pass watched value
                endDate={endDate} // pass watched value
              />

              <FormDivider />

              {/* Time Section */}
              <TimeSection
                control={control}
                setValue={setValue}
                dto={dto}
                isMultiDayTask={isMultiDayTask}
              />
            </>
          )}
        </ScrollView>

        {/* Submit */}
        <View className="px-8 py-6">
          <Pressable
            onPress={handleSubmit(handleFormSubmit)}
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
