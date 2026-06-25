import { TASK_WIDGET_OPEN_APP_DEEP_LINK } from "@/feature/widget/config/widget-config";

export type TaskWidgetSnapshotState = "placeholder" | "content" | "empty" | "fallback";

export type TaskWidgetSnapshotItem = {
  taskId: number | null;
  title: string;
  timeLabel: string;
  deepLink: string;
};

export type TasksWidgetSnapshot = {
  state: TaskWidgetSnapshotState;
  dateKey: string;
  title: string;
  message: string;
  openAppDeepLink: string;
  tasks: TaskWidgetSnapshotItem[];
};

export function buildTodayTasksWidgetSnapshot(
  dateKey: string,
  tasks: TaskWidgetSnapshotItem[],
): TasksWidgetSnapshot {
  if (tasks.length === 0) {
    return {
      state: "empty",
      dateKey,
      title: "Today",
      message: "Open BlotzTask to plan your day.",
      openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
      tasks: [],
    };
  }

  return {
    state: "content",
    dateKey,
    title: "Today",
    message: "",
    openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
    tasks,
  };
}

export function buildTodayTasksWidgetPlaceholderSnapshot(dateKey: string): TasksWidgetSnapshot {
  return {
    state: "placeholder",
    dateKey,
    title: "Today",
    message: "Open BlotzTask to load today's tasks.",
    openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
    tasks: [],
  };
}

export function buildTodayTasksWidgetFallbackSnapshot(
  dateKey: string,
  message = "Open BlotzTask to refresh today's tasks.",
): TasksWidgetSnapshot {
  return {
    state: "fallback",
    dateKey,
    title: "Today",
    message,
    openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
    tasks: [],
  };
}
