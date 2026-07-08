import { APP_LINK } from "@/feature/widget/config/widget-config";
import type {
  TaskWidgetSnapshotItem,
  TasksWidgetSnapshot,
} from "@/feature/widget/models/today-tasks-widget-snapshot";

export function buildTodayTasksWidgetSnapshot(
  cacheDate: string,
  tasks: TaskWidgetSnapshotItem[],
  widgetMessage: {
    title: string;
    emptyMessage: string;
    footerText: string;
  },
): TasksWidgetSnapshot {
  if (tasks.length === 0) {
    return {
      cacheDate,
      title: widgetMessage.title,
      message: widgetMessage.emptyMessage,
      footerText: widgetMessage.footerText,
      appLink: APP_LINK,
      tasks: [],
    };
  }

  return {
    cacheDate,
    title: widgetMessage.title,
    message: "",
    footerText: widgetMessage.footerText,
    appLink: APP_LINK,
    tasks,
  };
}
