import { format } from "date-fns";

import { filterSelectedTask } from "@/feature/calendar/util/task-counts";
import { formatTaskEndTime } from "@/feature/calendar/util/format-task-end-time";
import { APP_LINK } from "@/feature/widget/config/widget-config";
import type { TaskWidgetCache } from "@/feature/widget/models/task-widget-cache";
import type {
  TaskWidgetSnapshotItem,
  TasksWidgetSnapshot,
  TodayTasksWidgetMessage,
} from "@/feature/widget/models/today-tasks-widget-snapshot";
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

export function buildWidgetTaskCache(
  daySources: TaskWidgetDaySource[],
  widgetMessage: TodayTasksWidgetMessage,
  generatedAt = new Date(),
): TaskWidgetCache {
  const days = Object.fromEntries(
    daySources.map((source) => {
      const dateKey = getTaskWidgetDateKey(source.date);

      if (source.status === "error") {
        return [dateKey, buildTodayTasksWidgetSnapshot(dateKey, [], widgetMessage)];
      }

      const todoTasks =
        filterSelectedTask({ selectedDayTasks: source.tasks }).find(
          (group) => group.status === "To Do",
        )?.tasks ?? [];

      return [
        dateKey,
        buildTodayTasksWidgetSnapshot(
          dateKey,
          todoTasks.map(buildTaskWidgetSnapshotItem),
          widgetMessage,
        ),
      ];
    }),
  );

  return {
    generatedAt: generatedAt.toISOString(),
    days,
  };
}

export function selectTodayTasksWidgetSnapshot(
  cache: TaskWidgetCache | null,
  widgetMessage: TodayTasksWidgetMessage,
  now = new Date(),
): TasksWidgetSnapshot {
  const todayKey = getTaskWidgetDateKey(now);
  return cache?.days[todayKey] ?? buildTodayTasksWidgetSnapshot(todayKey, [], widgetMessage);
}

export function getTaskWidgetDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function buildTaskWidgetSnapshotItem(task: TaskDetailDTO): TaskWidgetSnapshotItem {
  return {
    taskId: task.id,
    title: task.title,
    timeLabel: formatTaskEndTime(task.endTime),
    link:
      task.id == null
        ? APP_LINK
        : `${APP_LINK}task-details?mode=persisted&taskId=${encodeURIComponent(String(task.id))}`,
  };
}
