import { parseISO } from "date-fns";
import TodayTasksWidget from "@/feature/widget/ios/components/today-tasks-widget";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";

export async function syncIosTodayTasksWidgetCache(
  cache: Record<string, TasksWidgetSnapshot>,
): Promise<void> {
  try {
    await TodayTasksWidget.updateTimeline(
      Object.values(cache)
        .sort((first, second) => first.cacheDate.localeCompare(second.cacheDate))
        .map((snapshot) => ({
          date: parseISO(snapshot.cacheDate),
          props: snapshot,
        })),
    );
  } catch {
    // Widget timeline updates are best-effort.
  }
}
