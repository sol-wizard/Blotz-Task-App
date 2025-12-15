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
import {
  buildTaskTimePayload,
  calculateAlertSeconds,
  calculateAlertTime,
} from "./util/time-convertion";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { cancelNotification } from "@/shared/util/cancel-notification";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";

type TaskFormProps =
  | {
      mode: "create";
      dto?: undefined;
      onSubmit: (data: AddTaskItemDTO) => void;
    }
  | {
      mode: "edit";
      dto: EditTaskItemDTO;
      onSubmit: (data: AddTaskItemDTO) => void;
    };

const TaskForm = ({ mode, dto, onSubmit }: TaskFormProps) => {
  const hasEventTimes = dto?.startTime && dto?.endTime && dto.startTime !== dto.endTime;
  const initialTab: SegmentButtonValue = mode === "edit" && hasEventTimes ? "event" : "reminder";

  const [isActiveTab, setIsActiveTab] = useState<SegmentButtonValue>(initialTab);

  const { labels = [], isLoading, isError } = useAllLabels();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const initialAlertTime = calculateAlertSeconds(dto?.startTime, dto?.alertTime);

  const defaultValues: TaskFormField = {
    title: dto?.title ?? "",
    description: dto?.description ?? "",
    labelId: dto?.labelId ?? null,
    startDate: dto?.startTime ? new Date(dto?.startTime) : null,
    startTime: dto?.startTime ? new Date(dto?.startTime) : null,
    endDate: dto?.endTime ? new Date(dto?.endTime) : null,
    endTime: dto?.endTime ? new Date(dto?.endTime) : null,
    alert: initialAlertTime ?? 300,
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
    if (mode === "edit" && dto?.alertTime && new Date(dto?.alertTime) > new Date()) {
      await cancelNotification({
        notificationId: dto?.notificationId,
      });
    }

    const { startTime, endTime, timeType } = buildTaskTimePayload(
      data.startDate,
      data.startTime,
      isActiveTab === "reminder" ? data.startDate : data.endDate,
      isActiveTab === "reminder" ? data.startTime : data.endTime,
    );

    const notificationId = await createNotificationFromAlert({
      startTime,
      alert: data.alert,
      title: data.title,
    });

    const alertTime = calculateAlertTime(data.startTime, data.alert);
    const submitTask: AddTaskItemDTO = {
      title: data.title,
      description: data.description ?? undefined,
      startTime: startTime ? convertToDateTimeOffset(startTime) : undefined,
      endTime: endTime ? convertToDateTimeOffset(endTime) : undefined,
      labelId: data.labelId ?? undefined,
      timeType,
      alertTime: alertTime ? convertToDateTimeOffset(alertTime) : undefined,
      notificationId,
    };

    onSubmit(submitTask);
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
