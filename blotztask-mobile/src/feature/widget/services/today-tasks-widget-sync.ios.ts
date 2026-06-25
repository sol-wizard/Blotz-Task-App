import { parseISO } from "date-fns";
import type { TaskWidgetCache } from "@/feature/widget/models/task-widget-cache";

export function syncTodayTasksWidgetCache(cache: TaskWidgetCache): void {
  void syncTodayTasksWidgetCacheAsync(cache);
}

async function syncTodayTasksWidgetCacheAsync(cache: TaskWidgetCache): Promise<void> {
  try {
    const widgetModule = await import("@/feature/widget/ios/today-tasks-widget");
    widgetModule.default.updateTimeline(
      Object.values(cache.days)
        .sort((first, second) => first.dateKey.localeCompare(second.dateKey))
        .map((snapshot) => ({
          date: parseISO(snapshot.dateKey),
          props: snapshot,
        })),
    );
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("[TodayTasksWidget] Failed to update widget cache", error);
    }
  }
}
