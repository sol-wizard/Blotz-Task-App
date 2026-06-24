import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildTodayTasksWidgetFallbackSnapshot,
  type TaskWidgetSnapshotItem,
  type TaskWidgetSnapshotState,
  type TodayTasksWidgetSnapshot,
} from "@/feature/widget/models/today-tasks-widget-snapshot";

const TODAY_TASKS_WIDGET_SNAPSHOT_KEY = "blotztask.widget.todayTasksSnapshot.v1";

export async function writeTodayTasksWidgetSnapshot(
  snapshot: TodayTasksWidgetSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(TODAY_TASKS_WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function readTodayTasksWidgetSnapshot(): Promise<TodayTasksWidgetSnapshot | null> {
  try {
    const rawSnapshot = await AsyncStorage.getItem(TODAY_TASKS_WIDGET_SNAPSHOT_KEY);
    if (!rawSnapshot) return null;

    const parsed: unknown = JSON.parse(rawSnapshot);
    return isTodayTasksWidgetSnapshot(parsed) ? parsed : buildTodayTasksWidgetFallbackSnapshot();
  } catch {
    return buildTodayTasksWidgetFallbackSnapshot();
  }
}

function isTodayTasksWidgetSnapshot(value: unknown): value is TodayTasksWidgetSnapshot {
  if (!isRecord(value)) return false;

  return (
    isTaskWidgetSnapshotState(value.state) &&
    typeof value.generatedAt === "string" &&
    typeof value.snapshotDate === "string" &&
    typeof value.title === "string" &&
    typeof value.subtitle === "string" &&
    typeof value.message === "string" &&
    typeof value.openAppDeepLink === "string" &&
    typeof value.totalTaskCount === "number" &&
    typeof value.visibleTaskCount === "number" &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isTaskWidgetSnapshotItem)
  );
}

function isTaskWidgetSnapshotItem(value: unknown): value is TaskWidgetSnapshotItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.taskId === "number" &&
    typeof value.title === "string" &&
    typeof value.dueLabel === "string" &&
    typeof value.labelName === "string" &&
    typeof value.labelColor === "string" &&
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
