import { Platform } from "react-native";
import type { TodayTasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";

export function syncTodayTasksWidgetSnapshot(snapshot: TodayTasksWidgetSnapshot): void {
  if (Platform.OS !== "android") return;

  void import("@/feature/widget/services/today-tasks-widget-sync-android").then(
    ({ syncTodayTasksWidgetSnapshot: syncAndroidSnapshot }) => {
      syncAndroidSnapshot(snapshot);
    },
  );
}
