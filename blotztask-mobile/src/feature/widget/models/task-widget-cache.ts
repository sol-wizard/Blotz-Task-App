import { format } from "date-fns";

import { filterSelectedTask } from "@/feature/calendar/util/task-counts";
import { formatTaskEndTime } from "@/feature/calendar/util/format-task-end-time";
import { TASK_WIDGET_OPEN_APP_DEEP_LINK } from "@/feature/widget/config/widget-config";
import {
  buildTodayTasksWidgetFallbackSnapshot,
  buildTodayTasksWidgetSnapshot,
  type TaskWidgetSnapshotItem,
  type TasksWidgetSnapshot,
} from "@/feature/widget/models/today-tasks-widget-snapshot";
import type { TaskDetailDTO } from "@/shared/models/task-detail-dto";

export type TaskWidgetCache = {
  generatedAt: string;
  // maybe could add timezone here
  days: Record<string, TasksWidgetSnapshot>;
};

export type TaskWidgetDaySource =
  | {
      date: Date;
      status: "success"; // fetch task success
      tasks: TaskDetailDTO[];
    }
  | {
      date: Date;
      status: "error";
    };

export function buildWidgetTaskCache(
  daySources: TaskWidgetDaySource[],
  generatedAt = new Date(),
): TaskWidgetCache {
  const days = Object.fromEntries(
    daySources.map((source) => {
      const dateKey = getTaskWidgetDateKey(source.date);

      if (source.status === "error") {
        return [dateKey, buildTodayTasksWidgetFallbackSnapshot(dateKey)];
      }

      const todoTasks =
        filterSelectedTask({ selectedDayTasks: source.tasks }).find(
          (group) => group.status === "To Do",
        )?.tasks ?? [];

      return [
        dateKey,
        buildTodayTasksWidgetSnapshot(dateKey, todoTasks.map(buildTaskWidgetSnapshotItem)),
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
  now = new Date(),
): TasksWidgetSnapshot {
  const todayKey = getTaskWidgetDateKey(now);
  return cache?.days[todayKey] ?? buildTodayTasksWidgetFallbackSnapshot(todayKey);
}

// put to utils
export function getTaskWidgetDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function buildTaskWidgetSnapshotItem(task: TaskDetailDTO): TaskWidgetSnapshotItem {
  return {
    taskId: task.id,
    title: task.title,
    timeLabel: formatTaskEndTime(task.endTime),
    deepLink:
      task.id == null
        ? TASK_WIDGET_OPEN_APP_DEEP_LINK
        : `blotztask://task-details?mode=persisted&taskId=${encodeURIComponent(String(task.id))}`,
  };
}
