import React, { useState } from "react";
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
import { useUserPreferencesQuery } from "../settings/hooks/useUserPreferencesQuery";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { endOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";

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
  const { userPreferences, isUserPreferencesLoading } = useUserPreferencesQuery();
  const { t } = useTranslation("tasks");

  const [isActiveTab, setIsActiveTab] = useState<SegmentButtonValue>(initialTab);

  const { labels = [], isLoading } = useAllLabels();

  const initialAlertTime = calculateAlertSeconds(dto?.startTime, dto?.alertTime);

  const defaultAlert = userPreferences?.upcomingNotification
    ? (initialAlertTime ?? 300)
    : (initialAlertTime ?? null);

  const now = new Date();
  const defaultValues: TaskFormField = {
    title: dto?.title ?? "",
    description: dto?.description ?? "",
    labelId: dto?.labelId ?? null,
    startDate: dto?.startTime ? new Date(dto?.startTime) : now,
    startTime: dto?.startTime ? new Date(dto?.startTime) : now,
    endDate: dto?.endTime ? new Date(dto?.endTime) : now,
    endTime: dto?.endTime ? new Date(dto?.endTime) : now,
    alert: defaultAlert,
  };

  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: defaultValues,
  });

  const { handleSubmit, formState, control, setValue } = form;
  const { isSubmitting } = formState;

  if (isUserPreferencesLoading) {
    return <LoadingScreen />;
  }

  const handleFormSubmit = async (data: TaskFormField) => {
    // If editing and the existing alert is still scheduled in the future, cancel the old notification first
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

    let notificationId = null;
    let alertTime = undefined;
    if (userPreferences?.upcomingNotification) {
      notificationId = await createNotificationFromAlert({
        startTime,
        alert: data.alert,
        title: data.title,
      });
      alertTime = calculateAlertTime(data.startTime, data.alert);
    }

    const submitTask: AddTaskItemDTO = {
      title: data.title.trim(),
      description: data.description?.trim() ?? undefined,
      startTime: convertToDateTimeOffset(startTime!),
      endTime: convertToDateTimeOffset(endTime!),
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
    <View className="flex-1 bg-white">
      <FormProvider {...form}>
        <ScrollView className="flex-col my-2 px-8" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Title */}
          <Animated.View className="mb-4 bg-white" layout={MotionAnimations.layout}>
            <FormTextInput
              name="title"
              placeholder={t("form.newTask")}
              control={control}
              className="font-balooBold text-4xl leading-normal"
              inputProps={{
                multiline: false,
                blurOnSubmit: true,
                returnKeyType: "done",
              }}
            />
            {formState.errors.title && (
              <Text className="text-red-500 text-sm ml-1 font-baloo">
                {t("details.mustHaveTitleError")}
              </Text>
            )}
          </Animated.View>

          <Animated.View
            className="py-3 bg-background rounded-2xl px-4"
            layout={MotionAnimations.layout}
          >
            <FormTextInput
              name="description"
              placeholder={t("form.addNote")}
              control={control}
              className="font-baloo text-lg text-primary"
            />
          </Animated.View>

          <FormDivider />
          <SegmentToggle value={isActiveTab} setValue={handleTabChange} />

          {isActiveTab === "reminder" && <ReminderTab control={control} />}
          {isActiveTab === "event" && <EventTab control={control} />}
          <FormDivider />

          <AlertSelect control={control} />
          <FormDivider />

          {/* Label Select */}
          <Animated.View className="mb-8" layout={MotionAnimations.layout}>
            {isLoading ? (
              <Text className="font-baloo text-lg text-primary mt-3">
                {t("common:loading.categories")}
              </Text>
            ) : (
              <LabelSelect control={control} labels={labels} />
            )}
          </Animated.View>
        </ScrollView>

        {/* Submit */}
        <View className="px-8 py-6">
          <Pressable
            onPress={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl items-center justify-center ${
              isSubmitting ? "bg-gray-300" : "bg-lime-300"
            }`}
          >
            <Text className="font-balooBold text-xl text-black">
              {mode === "create" ? t("form.createTask") : t("form.updateTask")}
            </Text>
          </Pressable>
        </View>
      </FormProvider>
    </View>
  );
};

export default TaskForm;
