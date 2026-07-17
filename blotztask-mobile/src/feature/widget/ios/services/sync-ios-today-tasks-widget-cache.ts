import { parseISO } from "date-fns";
import TodayTasksWidget from "@/feature/widget/ios/components/ios-tasks-widget";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/tasks-widget-snapshot";

export async function syncIosTodayTasksWidgetCache(
  snapshots: TasksWidgetSnapshot[],
): Promise<void> {
  try {
    await TodayTasksWidget.updateTimeline(
      [...snapshots]
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
