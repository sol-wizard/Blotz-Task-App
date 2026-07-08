import { APP_LINK } from "@/feature/widget/config/widget-config";
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
      dateKey,
      title: widgetMessage.title,
      message: widgetMessage.emptyMessage,
      footerText: widgetMessage.footerText,
      appLink: APP_LINK,
      tasks: [],
    };
  }

  return {
    dateKey,
    title: widgetMessage.title,
    message: "",
    footerText: widgetMessage.footerText,
    appLink: APP_LINK,
    tasks,
  };
}
