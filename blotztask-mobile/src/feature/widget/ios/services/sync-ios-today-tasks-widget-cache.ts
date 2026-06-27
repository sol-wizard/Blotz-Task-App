import { parseISO } from "date-fns";
import TodayTasksWidget from "@/feature/widget/ios/components/today-tasks-widget";
import type { TaskWidgetCache } from "@/feature/widget/models/task-widget-cache";

export async function syncIosTodayTasksWidgetCache(cache: TaskWidgetCache): Promise<void> {
  try {
    await TodayTasksWidget.updateTimeline(
      Object.values(cache.days)
        .sort((first, second) => first.dateKey.localeCompare(second.dateKey))
        .map((snapshot) => ({
          date: parseISO(snapshot.dateKey),
          props: snapshot,
        })),
    );
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("[TodayTasksWidget] Failed to update iOS widget cache", error);
    }
  }
}
