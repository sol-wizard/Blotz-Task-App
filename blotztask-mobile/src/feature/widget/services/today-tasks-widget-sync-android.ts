import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";
import {
  TODAY_TASKS_WIDGET_NAME,
  type TodayTasksWidgetSnapshot,
} from "@/feature/widget/models/today-tasks-widget-snapshot";
import { TodayTasksWidget } from "@/feature/widget/android/today-tasks-widget";
import { writeTodayTasksWidgetSnapshot } from "@/feature/widget/services/today-tasks-widget-cache";

export function syncTodayTasksWidgetSnapshot(snapshot: TodayTasksWidgetSnapshot): void {
  void syncTodayTasksWidgetSnapshotAsync(snapshot);
}

async function syncTodayTasksWidgetSnapshotAsync(
  snapshot: TodayTasksWidgetSnapshot,
): Promise<void> {
  try {
    await writeTodayTasksWidgetSnapshot(snapshot);

    if (__DEV__) {
      console.info(
        `[TodayTasksWidget] Wrote ${snapshot.tasks.length} task(s), state=${snapshot.state}`,
      );
    }

    await requestWidgetUpdate({
      widgetName: TODAY_TASKS_WIDGET_NAME,
      renderWidget: (widgetInfo) =>
        React.createElement(TodayTasksWidget, {
          snapshot,
          widgetInfo,
        }),
    });
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("[TodayTasksWidget] Failed to update Android widget snapshot", error);
    }
  }
}
