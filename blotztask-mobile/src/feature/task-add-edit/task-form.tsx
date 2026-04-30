import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TaskFormField, taskFormSchema } from "./models/task-form-schema";
import { FormTextInput } from "@/shared/components/form-text-input";
import { LabelSelect } from "./components/label-select";
import { FormDivider } from "../../shared/components/form-divider";
import { ReminderTab } from "./components/reminder-tab";
import { SegmentButtonValue } from "./models/segment-button-value";
import { SegmentToggle } from "./components/segment-toggle";
import { useAllLabels } from "@/shared/hooks/useAllLabels";
import { EventTab } from "./components/event-tab";
import { AlertSelect } from "./components/alert-select";
import { DeadlineSection } from "./components/deadline-section";
import { getTaskFormDefaults } from "./util/get-task-form-defaults";
import { getTaskNotification } from "./util/get-task-notification";
import { buildTaskTimePayload, calculateAlertTime } from "./util/time-convertion";
import { combineDateTime } from "./util/combine-date-time";
import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { useUserPreferencesQuery } from "../settings/hooks/useUserPreferencesQuery";
import LoadingScreen from "@/shared/components/loading-screen";
import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";
import { MotionAnimations } from "@/shared/constants/animations/motion";
import { theme } from "@/shared/constants/theme";
import { addHours } from "date-fns";

export type TaskFormProps = {
  onSubmit: (data: TaskUpsertDTO) => void;
} & ({ mode: "create"; dto?: undefined } | { mode: "edit"; dto: TaskUpsertDTO });

const TaskForm = ({ mode, dto, onSubmit }: TaskFormProps) => {
  // Queries
  const { userPreferences, isUserPreferencesLoading } = useUserPreferencesQuery();
  const { labels = [], isLoading } = useAllLabels();
  const { t } = useTranslation("tasks");

  // Derived values
  const { initialTab, defaultValues } = getTaskFormDefaults({
    dto,
    allowNotification: userPreferences?.upcomingNotification,
  });

  const [isActiveTab, setIsActiveTab] = useState<SegmentButtonValue>(initialTab);

  // Form
  const form = useForm<TaskFormField>({
    resolver: zodResolver(taskFormSchema),
    mode: "onChange",
    defaultValues,
  });

  const { handleSubmit, formState, control, setValue, clearErrors, trigger, getValues } = form;
  const { isSubmitting } = formState;

  if (isUserPreferencesLoading) {
    return <LoadingScreen />;
  }

  // Handlers
  const handleFormSubmit = async (data: TaskFormField) => {
    const isReminderTab = isActiveTab === SegmentButtonValue.Reminder;
    const { startTime, endTime, timeType } = buildTaskTimePayload(
      data.startDate,
      data.startTime,
      isReminderTab ? data.startDate : data.endDate,
      isReminderTab ? data.startTime : data.endTime,
    );

    const newAlertTime = calculateAlertTime(startTime!, data.alert);
    const notificationId = await getTaskNotification({
      mode,
      dto,
      upcomingNotification: userPreferences?.upcomingNotification,
      newAlertTime,
      newTaskTitle: data.title,
    });

    const deadline = data.isDeadline ? combineDateTime(data.deadlineDate, data.deadlineTime) : null;

    const submitTask: TaskUpsertDTO = {
      title: data.title.trim(),
      description: data.description?.trim() ?? undefined,
      startTime: convertToDateTimeOffset(startTime!),
      endTime: convertToDateTimeOffset(endTime!),
      labelId: data.labelId ?? undefined,
      timeType,
      alertTime: notificationId && newAlertTime ? convertToDateTimeOffset(newAlertTime) : undefined,
      notificationId,
      isDeadline: data.isDeadline,
      dueAt: deadline ? convertToDateTimeOffset(deadline) : undefined,
    };

    onSubmit(submitTask);
  };

  const handleTabChange = (next: SegmentButtonValue) => {
    const startDate = getValues("startDate");
    const startTime = getValues("startTime");

    setIsActiveTab(next);
    clearErrors(["endDate", "endTime"]);

    if (next === SegmentButtonValue.Reminder) {
      setValue("endDate", startDate, { shouldValidate: false });
      setValue("endTime", startTime, { shouldValidate: false });
      clearErrors(["endDate", "endTime"]);
      return;
    }

    const oneHourLater = addHours(new Date(), 1);
    const twoHoursLater = addHours(new Date(), 2);
    setValue("startDate", oneHourLater);
    setValue("startTime", oneHourLater);
    setValue("endDate", twoHoursLater);
    setValue("endTime", twoHoursLater);
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
        {isActiveTab === SegmentButtonValue.Event && formState.errors.endTime && (
          <Text className="text-red-500 text-sm mb-4 font-baloo">
            {t(formState.errors.endTime.message || "")}
          </Text>
        )}
        {isActiveTab === SegmentButtonValue.Reminder && (
          <ReminderTab control={control} setValue={setValue} clearErrors={clearErrors} />
        )}
        {isActiveTab === SegmentButtonValue.Event && (
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
    </View>
  );
};

export default TaskForm;
