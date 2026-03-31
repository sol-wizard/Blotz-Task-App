import React, { useState, useEffect, useRef } from "react";
import Toast from "react-native-toast-message";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
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
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { theme } from "@/shared/constants/theme";
import RepeatSelectSheet, {
  RepeatConfig,
} from "@/feature/task-add-edit/components/repeat-select-sheet";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { AddRecurringTaskDTO, RecurrenceFrequency } from "@/shared/models/add-recurring-task-dto";
import { createRecurringTask } from "@/shared/services/task-service";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasEventTimes =
    dto?.timeType === 1 || (dto?.startTime && dto?.endTime && dto.startTime !== dto.endTime);
  const initialTab: SegmentButtonValue = mode === "edit" && hasEventTimes ? "event" : "reminder";
  const { userPreferences, isUserPreferencesLoading } = useUserPreferencesQuery();
  const { t } = useTranslation("tasks");

  const [isActiveTab, setIsActiveTab] = useState<SegmentButtonValue>(initialTab);
  const [isRepeatSheetOpen, setRepeatSheetOpen] = useState(false);
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig | null>(null);
  const [repeatSummary, setRepeatSummary] = useState<string | null>(null);

  const { labels = [], isLoading } = useAllLabels();

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

  const { handleSubmit, formState, control, setValue, clearErrors, trigger, watch, getValues } =
    form;
  const { isSubmitting } = formState;
  const selectedStartDate = form.watch("startDate");

  const toDaysOfWeekMask = (days: number[]): number => {
    return days.reduce((mask, day) => {
      // 1..7 => Mon..Sun, mapped to flag bits 1,2,4,8,16,32,64
      return mask | (1 << (day - 1));
    }, 0);
  };

  const toRecurrenceFrequency = (frequency: RepeatConfig["frequency"]): RecurrenceFrequency => {
    switch (frequency) {
      case "daily":
        return RecurrenceFrequency.Daily;
      case "weekly":
        return RecurrenceFrequency.Weekly;
      case "monthly":
        return RecurrenceFrequency.Monthly;
      case "yearly":
        return RecurrenceFrequency.Yearly;
    }
  };

  const startDate = watch("startDate");
  const startTime = watch("startTime");
  const endDate = watch("endDate");
  const endTime = watch("endTime");
  const isDdl = watch("isDeadline");
  const deadlineDate = watch("deadlineDate");
  const deadlineTime = watch("deadlineTime");

  const prevHasWarned = useRef(false);

  // If the deadline toggle is turned off and later back on, we want to be able
  // to show the warning again for the (still) invalid date/time configuration.
  useEffect(() => {
    if (!isDdl) {
      prevHasWarned.current = false;
    }
  }, [isDdl]);

  useEffect(() => {
    if (!isDdl || !deadlineDate || !deadlineTime) return;

    const currentStartDate = isActiveTab === "reminder" ? startDate : endDate;
    const currentStartTime = isActiveTab === "reminder" ? startTime : endTime;

    if (!currentStartDate || !currentStartTime) return;

    const currentDateTime = combineDateTime(currentStartDate, currentStartTime);
    const ddlDateTime = combineDateTime(deadlineDate, deadlineTime);

    if (!currentDateTime || !ddlDateTime) return;

    if (currentDateTime > ddlDateTime) {
      if (!prevHasWarned.current) {
        const warningText = t(
          isActiveTab === "reminder" ? "form.warningReminderAfterDdl" : "form.warningEventAfterDdl",
        );
        Toast.show({
          type: "error",
          text1: warningText,
          position: "top",
        });
        prevHasWarned.current = true;
      }
    } else {
      prevHasWarned.current = false;
    }
  }, [startDate, startTime, endDate, endTime, deadlineDate, deadlineTime, isDdl, isActiveTab, t]);

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

    if (mode === "create" && repeatConfig) {
      const recurringPayload: AddRecurringTaskDTO = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        timeType,
        labelId: data.labelId ?? undefined,
        templateStartTime: convertToDateTimeOffset(startTime!),
        templateEndTime: timeType === 1 && endTime ? convertToDateTimeOffset(endTime) : undefined,
        frequency: toRecurrenceFrequency(repeatConfig.frequency),
        interval: repeatConfig.interval,
        daysOfWeek:
          repeatConfig.frequency === "weekly"
            ? toDaysOfWeekMask(repeatConfig.daysOfWeek)
            : undefined,
        dayOfMonth:
          repeatConfig.frequency === "monthly" ? (repeatConfig.dayOfMonth ?? undefined) : undefined,
        startDate: format(repeatConfig.startDate, "yyyy-MM-dd"),
        endDate: repeatConfig.endDate ? format(repeatConfig.endDate, "yyyy-MM-dd") : undefined,
      };

      await createRecurringTask(recurringPayload);
      setRepeatSheetOpen(false);
      await queryClient.invalidateQueries({ queryKey: taskKeys.all });
      router.back();
      return;
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
          <FormTextInput<TaskFormField>
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
          <FormTextInput<TaskFormField>
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

        <Animated.View layout={MotionAnimations.layout}>
          <Pressable
            onPress={() => setRepeatSheetOpen(true)}
            className="flex-row items-center justify-between"
          >
            <Text className="font-baloo text-secondary text-xl mt-1">{t("form.repeat")}</Text>
            <Text className="font-baloo text-primary text-xl mt-1">
              {repeatSummary ?? t("form.never")}
            </Text>
          </Pressable>
        </Animated.View>
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

      <RepeatSelectSheet
        visible={isRepeatSheetOpen}
        selectedDate={selectedStartDate ?? new Date()}
        initialValue={repeatConfig}
        onClose={() => setRepeatSheetOpen(false)}
        onConfirm={(config, summary) => {
          setRepeatConfig(config);
          setRepeatSummary(summary);
        }}
      />
    </View>
  );
};

export default TaskForm;
