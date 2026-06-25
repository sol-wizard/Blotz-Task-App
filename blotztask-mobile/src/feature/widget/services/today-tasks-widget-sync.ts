import { Platform } from "react-native";
import type { TaskWidgetCache } from "@/feature/widget/models/task-widget-cache";

export function syncTodayTasksWidgetCache(cache: TaskWidgetCache): void {
  if (Platform.OS !== "android") return;

  void import("@/feature/widget/services/today-tasks-widget-sync-android").then(
    ({ syncTodayTasksWidgetCache: syncAndroidCache }) => {
      syncAndroidCache(cache);
    },
  );
}
