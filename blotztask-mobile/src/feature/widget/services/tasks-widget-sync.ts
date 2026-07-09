import { Platform } from "react-native";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/tasks-widget-snapshot";

export async function syncTodayTasksWidgetCache(
  cache: Record<string, TasksWidgetSnapshot>,
): Promise<void> {
  if (Platform.OS === "ios") {
    const { syncIosTodayTasksWidgetCache } =
      await import("@/feature/widget/ios/services/sync-ios-today-tasks-widget-cache");

    await syncIosTodayTasksWidgetCache(cache);
    return;
  }

  if (Platform.OS === "android") {
    const { syncAndroidTodayTasksWidgetCache } =
      await import("@/feature/widget/android/services/sync-android-today-tasks-widget-cache");

    await syncAndroidTodayTasksWidgetCache(cache);
  }
}
