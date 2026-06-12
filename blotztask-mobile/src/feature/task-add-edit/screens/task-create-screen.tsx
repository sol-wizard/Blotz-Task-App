import TaskForm from "@/feature/task-add-edit/task-form";
import { useRouter } from "expo-router";
import useTaskMutations from "@/shared/hooks/useTaskMutations";
import LoadingScreen from "@/shared/components/loading-screen";
import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { RecurringTaskCreateDTO } from "@/shared/models/recurring-task-create-dto";
import { SafeAreaView } from "react-native-safe-area-context";
import { analytics } from "@/shared/services/analytics";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { TaskTimeType } from "@/shared/models/base-task-dto";

export default function TaskCreateScreen() {
  const router = useRouter();
  const { addTask, createRecurringTask, isAdding, isCreatingRecurringTask } = useTaskMutations();
  const { t } = useTranslation("tasks");

  const handleTaskSubmit = (submitTask: TaskUpsertDTO) => {
    if (submitTask.recurrence && submitTask.recurrence !== "never") {
      const recurringTask = mapTaskToRecurringTask(submitTask);
      if (!recurringTask) return;

      createRecurringTask(recurringTask, {
        onSuccess: () => {
          analytics.trackManualTaskCreated();
          router.back();
          Toast.show({ type: "warning", text1: t("success.taskCreated") });
        },
      });
      return;
    }

    addTask(submitTask, {
      onSuccess: () => {
        analytics.trackManualTaskCreated();
        router.back();
        Toast.show({ type: "success", text1: t("success.taskCreated") });
      },
    });
  };

  if (isAdding || isCreatingRecurringTask) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <TaskForm mode="create" onSubmit={handleTaskSubmit} />
    </SafeAreaView>
  );
}

function mapTaskToRecurringTask(task: TaskUpsertDTO): RecurringTaskCreateDTO | null {
  const recurrence = task.recurrence;
  if (!recurrence || recurrence === "never" || recurrence === "custom") {
    return null;
  }
  const currentTimeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const frequencyMap = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  } as const;

  return {
    title: task.title,
    description: task.description,
    timeType: task.timeType,
    labelId: task.labelId,
    templateStartTime: task.startTime,
    templateEndTime: task.timeType === TaskTimeType.Single ? null : task.endTime,
    scheduleTimeZoneId: currentTimeZoneId,
    frequency: frequencyMap[recurrence],
    interval: recurrence === "biweekly" ? 2 : 1,
    daysOfWeek:
      recurrence === "weekly" || recurrence === "biweekly"
        ? getWeeklyDayFlag(toDateOnly(task.startTime))
        : null,
    dayOfMonth: recurrence === "monthly" ? new Date(task.startTime).getDate() : null,
    startDate: toDateOnly(task.startTime),
    endDate: task.recurrenceEndDate ?? null,
    isDeadline: task.isDeadline,
    templateDueAt: task.isDeadline ? task.dueAt ?? task.endTime : null,
    deadlineTimeZoneId: task.isDeadline ? currentTimeZoneId : null,
  };
}

function toDateOnly(dateTimeOffset: string): string {
  return dateTimeOffset.slice(0, 10);
}

function getWeeklyDayFlag(dateOnly: string): number {
  const [year, month, dayOfMonth] = dateOnly.split("-").map(Number);
  const day = new Date(year, month - 1, dayOfMonth).getDay();
  const dayFlags = [64, 1, 2, 4, 8, 16, 32] as const;
  return dayFlags[day];
}
