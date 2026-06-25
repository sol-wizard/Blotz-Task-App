import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TaskWidgetCache } from "@/feature/widget/models/task-widget-cache";
import type {
  TaskWidgetSnapshotItem,
  TaskWidgetSnapshotState,
  TasksWidgetSnapshot,
} from "@/feature/widget/models/today-tasks-widget-snapshot";

const TODAY_TASKS_WIDGET_CACHE_KEY = "blotztask.widget.todayTasksCache.v2";

export async function writeTodayTasksWidgetCache(cache: TaskWidgetCache): Promise<void> {
  await AsyncStorage.setItem(TODAY_TASKS_WIDGET_CACHE_KEY, JSON.stringify(cache));
}

export async function readTodayTasksWidgetCache(): Promise<TaskWidgetCache | null> {
  try {
    const rawCache = await AsyncStorage.getItem(TODAY_TASKS_WIDGET_CACHE_KEY);
    if (!rawCache) return null;

    const parsed: unknown = JSON.parse(rawCache);
    return isTaskWidgetCache(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isTaskWidgetCache(value: unknown): value is TaskWidgetCache {
  if (!isRecord(value) || typeof value.generatedAt !== "string" || !isRecord(value.days)) {
    return false;
  }

  return Object.values(value.days).every(isTodayTasksWidgetSnapshot);
}

function isTodayTasksWidgetSnapshot(value: unknown): value is TasksWidgetSnapshot {
  if (!isRecord(value)) return false;

  return (
    isTaskWidgetSnapshotState(value.state) &&
    typeof value.dateKey === "string" &&
    typeof value.title === "string" &&
    typeof value.message === "string" &&
    typeof value.openAppDeepLink === "string" &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isTaskWidgetSnapshotItem)
  );
}

function isTaskWidgetSnapshotItem(value: unknown): value is TaskWidgetSnapshotItem {
  if (!isRecord(value)) return false;

  return (
    (typeof value.taskId === "number" || value.taskId === null) &&
    typeof value.title === "string" &&
    typeof value.timeLabel === "string" &&
    typeof value.deepLink === "string"
  );
}

function isTaskWidgetSnapshotState(value: unknown): value is TaskWidgetSnapshotState {
  return (
    value === "placeholder" || value === "content" || value === "empty" || value === "fallback"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
