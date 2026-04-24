import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useForm } from "react-hook-form";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { EditTaskItemDTO } from "./models/edit-task-item-dto";
import { FormTextInput } from "@/shared/components/form-text-input";
import { FailedToLoadLabel, LabelSelectWithData } from "./components/label-select";
import { FormDivider } from "../../shared/components/form-divider";
import { ReminderTab } from "./components/reminder-tab";
import { SegmentButtonValue } from "./models/segment-button-value";
import { SegmentToggle } from "./components/segment-toggle";
import { EventTab } from "./components/event-tab";
import { AlertSelect } from "./components/alert-select";
import { DeadlineSection } from "./components/deadline-section";
import { createNotificationFromAlert } from "./util/create-notification-from-alert";
import {
  buildTaskTimePayload,
  calculateAlertSeconds,
  calculateAlertTime,
} from "./util/time-convertion";
import { combineDateTime } from "./util/combine-date-time";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { cancelNotification } from "@/shared/util/cancel-notification";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { useUserPreferencesQuery } from "../settings/hooks/useUserPreferencesQuery";
import LoadingScreen from "@/shared/components/loading-screen";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { theme } from "@/shared/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
  const hasEventTimes =
    dto?.timeType === 1 || (dto?.startTime && dto?.endTime && dto.startTime !== dto.endTime);
  const initialTab: SegmentButtonValue = mode === "edit" && hasEventTimes ? "event" : "reminder";
  const { userPreferences, isUserPreferencesLoading } = useUserPreferencesQuery();
  const { t } = useTranslation("tasks");

  const [isActiveTab, setIsActiveTab] = useState<SegmentButtonValue>(initialTab);

  const initialAlertTime = calculateAlertSeconds(dto?.startTime, dto?.alertTime);

  const defaultAlert = userPreferences?.upcomingNotification
    ? (initialAlertTime ?? 300)
    : (initialAlertTime ?? null);

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 3600000);
  const initialDueAt = dto?.dueAt ? new Date(dto.dueAt) : null;

  const initialStartDate = dto?.startTime ? new Date(dto.startTime) : now;
  const initialStartTime = dto?.startTime ? new Date(dto.startTime) : now;
  const initialEndDate = dto?.endTime ? new Date(dto.endTime) : oneHourLater;
  const initialEndTime = dto?.endTime ? new Date(dto.endTime) : oneHourLater;

  const defaultValues: TaskFormField = {
    title: dto?.title ?? "",
    description: dto?.description ?? "",
    labelId: dto?.labelId ?? null,
    startDate: initialStartDate,
    startTime: initialStartTime,
    endDate: initialTab === "reminder" ? initialStartDate : initialEndDate,
    endTime: initialTab === "reminder" ? initialStartTime : initialEndTime,
    alert: defaultAlert,
    isDeadline: dto?.isDeadline ?? !!initialDueAt,
    deadlineDate: initialDueAt ?? oneHourLater,
    deadlineTime: initialDueAt ?? oneHourLater,
  };

  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues: defaultValues,
  });

  const { handleSubmit, formState, control, setValue, clearErrors, trigger, getValues } = form;
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
      alertTime = calculateAlertTime(startTime!, data.alert);
    }

    const deadline = data.isDeadline ? combineDateTime(data.deadlineDate, data.deadlineTime) : null;

    const submitTask: AddTaskItemDTO = {
      title: data.title.trim(),
      description: data.description?.trim() ?? undefined,
      startTime: convertToDateTimeOffset(startTime!),
      endTime: convertToDateTimeOffset(endTime!),
      labelId: data.labelId ?? undefined,
      timeType,
      alertTime: alertTime ? convertToDateTimeOffset(alertTime) : undefined,
      notificationId,
      isDeadline: data.isDeadline,
      dueAt: deadline ? convertToDateTimeOffset(deadline) : undefined,
    };

    onSubmit(submitTask);
  };

  const handleTabChange = (next: SegmentButtonValue) => {
    setIsActiveTab(next);
    clearErrors(["endDate", "endTime"]);

    const startDate = getValues("startDate");
    const startTime = getValues("startTime");

    if (next === "reminder") {
      setValue("endDate", startDate, { shouldValidate: false });
      setValue("endTime", startTime, { shouldValidate: false });
      clearErrors(["endDate", "endTime"]);
      return;
    }

    const start = new Date();
    const oneHourLater = new Date(start.getTime() + 3600000);
    setValue("startDate", start);
    setValue("startTime", start);
    setValue("endDate", oneHourLater);
    setValue("endTime", oneHourLater);
    trigger("endTime");
  };

  return (
    <View className="flex-1 bg-white">
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
              placeholderTextColor: theme.colors.disabled,
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
            inputProps={{
              placeholderTextColor: theme.colors.primary,
            }}
          />
        </Animated.View>

        <FormDivider />
        <SegmentToggle value={isActiveTab} setValue={handleTabChange} />
        {isActiveTab === "event" && formState.errors.endTime && (
          <Text className="text-red-500 text-sm mb-4 font-baloo">
            {t(formState.errors.endTime.message || "")}
          </Text>
        )}
        {isActiveTab === "reminder" && (
          <ReminderTab control={control} setValue={setValue} clearErrors={clearErrors} />
        )}
        {isActiveTab === "event" && (
          <EventTab
            control={control}
            trigger={trigger}
            clearErrors={clearErrors}
            setValue={setValue}
          />
        )}
        <FormDivider />
        <DeadlineSection control={control} getValues={form.getValues} isActiveTab={isActiveTab} />
        <FormDivider />

        <AlertSelect control={control} />
        <FormDivider />

        {/* Label Select */}
        <Animated.View className="mb-8" layout={MotionAnimations.layout}>
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary onReset={reset} FallbackComponent={FailedToLoadLabel}>
                <LabelSelectWithData control={control} />
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
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
    </View>
  );
};

export default TaskForm;
