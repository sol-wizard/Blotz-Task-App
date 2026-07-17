import { format } from "date-fns";

import { filterSelectedTask } from "@/feature/calendar/util/task-counts";
import { formatTaskEndTime } from "@/feature/calendar/util/format-task-end-time";
import { APP_LINK } from "@/feature/widget/config/widget-config";
import type {
  TaskWidgetSnapshotItem,
  TasksWidgetSnapshot,
} from "@/feature/widget/models/tasks-widget-snapshot";
import { buildTodayTasksWidgetSnapshot } from "@/feature/widget/util/today-tasks-widget-snapshot-util";
import type { TaskDetailDTO } from "@/shared/models/task-detail-dto";

export type TaskWidgetDaySource =
  | {
      date: Date;
      status: "success";
      tasks: TaskDetailDTO[];
    }
  | {
      date: Date;
      status: "error";
    };

export function buildTaskWidgetSnapshots(
  daySources: TaskWidgetDaySource[],
  widgetMessage: {
    title: string;
    emptyMessage: string;
  },
): TasksWidgetSnapshot[] {
  return daySources.map((source) => {
    const cacheDate = format(source.date, "yyyy-MM-dd");

    if (source.status === "error") {
      return buildTodayTasksWidgetSnapshot(cacheDate, [], widgetMessage);
    }

    const todoTasks =
      filterSelectedTask({ selectedDayTasks: source.tasks }).find(
        (group) => group.status === "To Do",
      )?.tasks ?? [];

    return buildTodayTasksWidgetSnapshot(
      cacheDate,
      todoTasks.map(buildTaskWidgetSnapshotItem),
      widgetMessage,
    );
  });
}

function buildTaskWidgetSnapshotItem(task: TaskDetailDTO): TaskWidgetSnapshotItem {
  return {
    title: task.title,
    time: formatTaskEndTime(task.endTime),
    link:
      task.id == null
        ? APP_LINK
        : `${APP_LINK}task-details?mode=persisted&taskId=${encodeURIComponent(String(task.id))}`,
  };
}
