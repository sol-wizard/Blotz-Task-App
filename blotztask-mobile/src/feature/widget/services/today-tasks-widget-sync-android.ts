import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";
import { TODAY_TASKS_WIDGET_NAME } from "@/feature/widget/config/widget-config";
import {
  selectTodayTasksWidgetSnapshot,
  type TaskWidgetCache,
} from "@/feature/widget/models/task-widget-cache";
import { TodayTasksWidget } from "@/feature/widget/android/today-tasks-widget";
import { writeTodayTasksWidgetCache } from "@/feature/widget/services/today-tasks-widget-cache";

export function syncTodayTasksWidgetCache(cache: TaskWidgetCache): void {
  void syncTodayTasksWidgetCacheAsync(cache);
}

async function syncTodayTasksWidgetCacheAsync(cache: TaskWidgetCache): Promise<void> {
  try {
    await writeTodayTasksWidgetCache(cache);
    const snapshot = selectTodayTasksWidgetSnapshot(cache);

    if (__DEV__) {
      console.info(
        `[TodayTasksWidget] Wrote ${Object.keys(cache.days).length} cached day(s), today=${snapshot.state}`,
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
      console.warn("[TodayTasksWidget] Failed to update Android widget cache", error);
    }
  }
}
