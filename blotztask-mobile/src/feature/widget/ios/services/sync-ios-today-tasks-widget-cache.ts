import { parseISO } from "date-fns";
import TodayTasksWidget from "@/feature/widget/ios/components/today-tasks-widget";
import type { TaskWidgetCache } from "@/feature/widget/models/task-widget-cache";

export async function syncIosTodayTasksWidgetCache(cache: TaskWidgetCache): Promise<void> {
  try {
    await TodayTasksWidget.updateTimeline(
      Object.values(cache.days)
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
