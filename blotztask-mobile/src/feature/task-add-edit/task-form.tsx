import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { LabelSelect } from "./components/label-select";
import { FormDivider } from "../../shared/components/ui/form-divider";
import { ReminderTab } from "./components/reminder-tab";
import { EventTab } from "./components/event-tab";
import { isEqual } from "date-fns";
import { combineDateTime } from "./util/combine-date-time";
import { SegmentButtonValue } from "./models/segment-button-value";
import { SegmentToggle } from "./components/segment-toggle";
import { Snackbar } from "react-native-paper";
import { useAllLabels } from "@/shared/hooks/useAllLabels";

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
  const defaultValues: TaskFormField = {
    title: dto?.title ?? "",
    description: dto?.description ?? "",
    labelId: dto?.labelId ?? null,
    startDate: dto?.startTime ?? null,
    startTime: dto?.startTime ?? null,
    endDate: dto?.endTime ?? null,
    endTime: dto?.endTime ?? null,
  };

  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: defaultValues,
  });

  const { handleSubmit, formState, control, setValue } = form;
  const { isValid, isSubmitting } = formState;

  const startCombined = combineDateTime(defaultValues.startDate, defaultValues.startTime);
  const endCombined = combineDateTime(defaultValues.endDate, defaultValues.endTime);
  const initialTab: SegmentButtonValue =
    !startCombined || !endCombined || isEqual(startCombined, endCombined) ? "reminder" : "event";

  const [isActiveTab, setIsActiveTab] = useState<SegmentButtonValue>(initialTab);
  const labelId = useWatch({ control, name: "labelId" });
  const { labels = [], isLoading, isError } = useAllLabels();

  const handleFormSubmit = (data: TaskFormField) => {
    onSubmit(data);
  };

  const handleTabChange = (next: SegmentButtonValue) => {
    setIsActiveTab(next);

    setValue("startDate", null);
    setValue("startTime", null);
    setValue("endDate", null);
    setValue("endTime", null);
  };

  return (
    <>
      <View className="flex-1 bg-white">
        <FormProvider {...form}>
          <ScrollView className="flex-col py-6 px-8" contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Title */}
            <View className="mb-4 bg-white">
              <FormTextInput
                name="title"
                placeholder="New Task"
                control={control}
                className="font-balooBold text-4xl leading-normal"
              />
            </View>

            <View className="mb-8 py-3 bg-background rounded-2xl px-4">
              <FormTextInput
                name="description"
                placeholder="Add a note"
                control={control}
                className="font-baloo text-lg text-tertiary"
              />
            </View>

            <FormDivider />
            <SegmentToggle value={isActiveTab} setValue={handleTabChange} />

            {isActiveTab === "reminder" && <ReminderTab control={control} />}
            {isActiveTab === "event" && <EventTab control={control} />}
            <FormDivider />

            {/* Label Select */}
            <View className="mb-8">
              {/* <Text className="font-balooBold text-3xl leading-normal">Category</Text> */}
              {isLoading ? (
                <Text className="font-baloo text-lg text-tertiary mt-3">Loading categories...</Text>
              ) : (
                <LabelSelect control={control} labels={labels} selectedValue={labelId} />
              )}
            </View>

            <FormDivider />
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
              <Text className="font-balooBold text-xl text-black">
                {mode === "create" ? "Create Task" : "Update Task"}
              </Text>
            </Pressable>
          </View>
        </FormProvider>
      </View>
      <Snackbar
        visible={isError}
        onDismiss={() => {}}
        duration={3000}
        action={{
          label: "Dismiss",
          onPress: () => {},
        }}
      >
        Failed to load categories. Please check your connection.
      </Snackbar>
    </>
  );
};

export default TaskForm;
