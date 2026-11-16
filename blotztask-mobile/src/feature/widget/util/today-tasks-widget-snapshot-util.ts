import { parseISO } from "date-fns";

import { APP_LINK } from "@/feature/widget/config/widget-config";
import type {
  TaskWidgetSnapshotItem,
  TasksWidgetSnapshot,
} from "@/feature/widget/models/tasks-widget-snapshot";
import { formatLocalizedDate } from "@/shared/util/localized-date-format";

export function buildTodayTasksWidgetSnapshot(
  cacheDate: string,
  tasks: TaskWidgetSnapshotItem[],
  widgetMessage: {
    title: string;
    emptyMessage: string;
  },
): TasksWidgetSnapshot {
  const dateTitle = formatLocalizedDate(parseISO(cacheDate), "abbrevMonthDay");

  if (tasks.length === 0) {
    return {
      cacheDate,
      title: widgetMessage.title,
      dateTitle,
      message: widgetMessage.emptyMessage,
      appLink: APP_LINK,
      tasks: [],
    };
  }

  return {
    cacheDate,
    title: widgetMessage.title,
    dateTitle,
    message: "",
    appLink: APP_LINK,
    tasks,
  };
}
