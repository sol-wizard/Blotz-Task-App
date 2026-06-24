import { format, isSameDay, parseISO } from "date-fns";
import type { TaskDetailDTO } from "@/shared/models/task-detail-dto";

export const TODAY_TASKS_WIDGET_NAME = "TodayTasksWidget";
export const TASK_WIDGET_OPEN_APP_DEEP_LINK = "blotztask://";

const MAX_WIDGET_TASKS = 5;

export type TaskWidgetSnapshotState = "placeholder" | "content" | "empty" | "fallback";

export type TaskWidgetSnapshotItem = {
  taskId: number;
  title: string;
  dueLabel: string;
  labelName: string;
  labelColor: string;
  deepLink: string;
};

export type TodayTasksWidgetSnapshot = {
  state: TaskWidgetSnapshotState;
  generatedAt: string;
  title: string;
  subtitle: string;
  message: string;
  openAppDeepLink: string;
  totalTaskCount: number;
  visibleTaskCount: number;
  tasks: TaskWidgetSnapshotItem[];
};

export function buildTodayTasksWidgetSnapshot(
  tasks: TaskDetailDTO[],
  generatedAt = new Date(),
): TodayTasksWidgetSnapshot {
  const visibleTasks = tasks
    .filter((task) => !task.isDone)
    .sort(compareTasksByStartTime)
    .slice(0, MAX_WIDGET_TASKS)
    .map(buildTaskWidgetSnapshotItem);

  if (visibleTasks.length === 0) {
    return {
      state: "empty",
      generatedAt: generatedAt.toISOString(),
      title: "Today",
      subtitle: "No unfinished tasks",
      message: "Open BlotzTask to plan your day.",
      openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
      totalTaskCount: tasks.length,
      visibleTaskCount: 0,
      tasks: [],
    };
  }

  return {
    state: "content",
    generatedAt: generatedAt.toISOString(),
    title: "Today",
    subtitle: `${visibleTasks.length} task${visibleTasks.length === 1 ? "" : "s"} left`,
    message: "",
    openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
    totalTaskCount: tasks.length,
    visibleTaskCount: visibleTasks.length,
    tasks: visibleTasks,
  };
}

export function buildTodayTasksWidgetPlaceholderSnapshot(
  generatedAt = new Date(),
): TodayTasksWidgetSnapshot {
  return {
    state: "placeholder",
    generatedAt: generatedAt.toISOString(),
    title: "Today",
    subtitle: "Loading tasks",
    message: "Open BlotzTask to load today's tasks.",
    openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
    totalTaskCount: 0,
    visibleTaskCount: 0,
    tasks: [],
  };
}

export function buildTodayTasksWidgetFallbackSnapshot(
  message = "Open BlotzTask to refresh today's tasks.",
  generatedAt = new Date(),
): TodayTasksWidgetSnapshot {
  return {
    state: "fallback",
    generatedAt: generatedAt.toISOString(),
    title: "Today",
    subtitle: "Tasks unavailable",
    message,
    openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
    totalTaskCount: 0,
    visibleTaskCount: 0,
    tasks: [],
  };
}

function buildTaskWidgetSnapshotItem(task: TaskDetailDTO): TaskWidgetSnapshotItem {
  return {
    taskId: task.id ?? 0,
    title: task.title,
    dueLabel: buildDueLabel(task) ?? "",
    labelName: task.label?.name ?? "",
    labelColor: task.label?.color ?? "",
    deepLink: task.id == null ? "" : buildTaskDetailDeepLink(task.id),
  };
}

function compareTasksByStartTime(first: TaskDetailDTO, second: TaskDetailDTO): number {
  return getTimeOrMax(first.startTime) - getTimeOrMax(second.startTime);
}

function buildTaskDetailDeepLink(taskId: number): string {
  return `blotztask://task-details?mode=persisted&taskId=${encodeURIComponent(String(taskId))}`;
}

function buildDueLabel(task: TaskDetailDTO): string | null {
  const deadline = task.dueAt ? parseDate(task.dueAt) : null;
  if (task.isDeadline && deadline) return `Due ${format(deadline, "h:mm a")}`;

  const start = parseDate(task.startTime);
  const end = parseDate(task.endTime);
  if (!start || !end) return null;

  if (start.getTime() === end.getTime()) return format(start, "h:mm a");
  if (isSameDay(start, end)) return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;

  return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
}

function parseDate(value: string): Date | null {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTimeOrMax(value: string): number {
  return parseDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER;
}
