import { TASK_WIDGET_OPEN_APP_DEEP_LINK } from "@/feature/widget/config/widget-config";
import type {
  TaskWidgetSnapshotItem,
  TasksWidgetSnapshot,
  TodayTasksWidgetMessage,
} from "@/feature/widget/models/today-tasks-widget-snapshot";

export function buildTodayTasksWidgetSnapshot(
  dateKey: string,
  tasks: TaskWidgetSnapshotItem[],
  widgetMessage: TodayTasksWidgetMessage,
): TasksWidgetSnapshot {
  if (tasks.length === 0) {
    return {
      state: "empty",
      dateKey,
      title: widgetMessage.title,
      message: widgetMessage.emptyMessage,
      footerText: widgetMessage.footerText,
      openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
      tasks: [],
    };
  }

  return {
    state: "content",
    dateKey,
    title: widgetMessage.title,
    message: "",
    footerText: widgetMessage.footerText,
    openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
    tasks,
  };
}

export function buildTodayTasksWidgetFallbackSnapshot(
  dateKey: string,
  widgetMessage: TodayTasksWidgetMessage,
  fallbackMessage = widgetMessage.fallbackMessage,
): TasksWidgetSnapshot {
  return {
    state: "fallback",
    dateKey,
    title: widgetMessage.title,
    message: fallbackMessage,
    footerText: widgetMessage.footerText,
    openAppDeepLink: TASK_WIDGET_OPEN_APP_DEEP_LINK,
    tasks: [],
  };
}
