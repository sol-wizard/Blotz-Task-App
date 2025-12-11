import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import { FormTextInput } from "@/shared/components/ui/form-text-input";
import { LabelSelect } from "./components/label-select";
import { FormDivider } from "../../shared/components/ui/form-divider";
import { ReminderTab } from "./components/reminder-tab";
import { SegmentButtonValue } from "./models/segment-button-value";
import { SegmentToggle } from "./components/segment-toggle";
import { Snackbar } from "react-native-paper";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { EventTab } from "./components/event-tab";
import { AlertSelect } from "./components/alert-select";
import { createNotificationFromAlert } from "./util/create-notification-from-alert";
import { SubmitTaskDTO } from "./models/submit-task-dto";
import * as Notifications from "expo-notifications";
import { getNotificationTime } from "./util/get-notification-time";

type TaskFormProps =
  | {
      mode: "create";
      dto?: undefined;
      onSubmit: (data: SubmitTaskDTO) => void;
    }
  | {
      mode: "edit";
      dto: EditTaskItemDTO;
      onSubmit: (data: SubmitTaskDTO) => void;
    };

const TaskForm = ({ mode, dto, onSubmit }: TaskFormProps) => {
  const hasEventTimes =
    dto?.startTime && dto?.endTime && dto.startTime.getTime() !== dto.endTime.getTime();
  const initialTab: SegmentButtonValue = mode === "edit" && hasEventTimes ? "event" : "reminder";

  const [isActiveTab, setIsActiveTab] = useState<SegmentButtonValue>(initialTab);
  const [triggerTime, setTriggerTime] = useState<number | null>(null);

  const { labels = [], isLoading, isError } = useAllLabels();
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useEffect(() => {
    async function loadTriggerTime() {
      console.log("Loading trigger time for notification ID:", dto?.notificationId);
      const triggerTime = await getNotificationTime(dto?.endTime!, dto?.notificationId!);
      setTriggerTime(triggerTime);
      console.log("Loaded trigger time:", triggerTime);
    }
    if (mode === "edit") loadTriggerTime();
  }, [mode]);

  const defaultValues: TaskFormField = {
    title: dto?.title ?? "",
    description: dto?.description ?? "",
    labelId: dto?.labelId ?? null,
    startDate: dto?.startTime ?? null,
    startTime: dto?.startTime ?? null,
    endDate: dto?.endTime ?? null,
    endTime: dto?.endTime ?? null,
    alert: triggerTime ?? 300,
  };

  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: defaultValues,
  });

  const { handleSubmit, formState, control, setValue } = form;
  const { isValid, isSubmitting } = formState;

  useEffect(() => {
    if (isError) {
      setSnackbarVisible(true);
    }
  }, [isError]);

  const handleFormSubmit = async (data: TaskFormField) => {
    if (mode === "edit" && dto?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(dto?.notificationId);
    }
    const notificationId = await createNotificationFromAlert(data);
    console.log("Scheduled Notification ID:", notificationId);
    const payload = { ...data, notificationId };

    if (isActiveTab === "reminder") {
      onSubmit({
        ...payload,
        endDate: payload.startDate,
        endTime: payload.startTime,
      });
      return;
    }

    onSubmit(payload);
  };

  const handleTabChange = (next: SegmentButtonValue) => {
    setIsActiveTab(next);

    if (mode === "edit" || next === "reminder") {
      setValue("startDate", defaultValues.startDate);
      setValue("startTime", defaultValues.startTime);
      setValue("endDate", defaultValues.endDate);
      setValue("endTime", defaultValues.endTime);
      return;
    }

    const start = new Date();
    const oneHourLater = new Date(start.getTime() + 3600000);
    setValue("startDate", start);
    setValue("startTime", start);
    setValue("endDate", oneHourLater);
    setValue("endTime", oneHourLater);
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
                className="font-baloo text-lg text-primary"
              />
            </View>

            <FormDivider />
            <SegmentToggle value={isActiveTab} setValue={handleTabChange} />

            {isActiveTab === "reminder" && <ReminderTab control={control} />}
            {isActiveTab === "event" && <EventTab control={control} />}
            <FormDivider />
            <AlertSelect control={control} />
            <FormDivider />

            {/* Label Select */}
            <View className="mb-8">
              {isLoading ? (
                <Text className="font-baloo text-lg text-primary mt-3">Loading categories...</Text>
              ) : (
                <LabelSelect control={control} labels={labels} />
              )}
            </View>
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
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "Dismiss",
          onPress: () => setSnackbarVisible(false),
        }}
      >
        Failed to load categories. Please try again.
      </Snackbar>
    </>
  );
};

export default TaskForm;
