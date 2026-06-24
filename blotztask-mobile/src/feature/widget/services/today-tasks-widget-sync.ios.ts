import type { TodayTasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";

export function syncTodayTasksWidgetSnapshot(snapshot: TodayTasksWidgetSnapshot): void {
  void syncTodayTasksWidgetSnapshotAsync(snapshot);
}

async function syncTodayTasksWidgetSnapshotAsync(
  snapshot: TodayTasksWidgetSnapshot,
): Promise<void> {
  try {
    const widgetModule = await import("@/feature/widget/ios/today-tasks-widget");
    widgetModule.default.updateSnapshot(snapshot);
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("[TodayTasksWidget] Failed to update widget snapshot", error);
    }
  }
}
