import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";

import { ANDROID_TODAY_TASKS_WIDGET_NAMES } from "@/feature/widget/config/widget-config";
import type { TaskWidgetCache } from "@/feature/widget/models/task-widget-cache";
import { selectTodayTasksWidgetSnapshot } from "@/feature/widget/util/task-widget-cache-util";
import { TodayTasksWidget } from "@/feature/widget/android/components/today-tasks-widget";
import { writeTodayTasksWidgetCache } from "@/feature/widget/android/services/today-tasks-widget-cache-storage";

export async function syncAndroidTodayTasksWidgetCache(cache: TaskWidgetCache): Promise<void> {
  try {
    await writeTodayTasksWidgetCache(cache);

    const snapshot = selectTodayTasksWidgetSnapshot(cache);

    if (__DEV__) {
      console.info(
        `[TodayTasksWidget] Wrote ${Object.keys(cache.days).length} cached day(s), today=${snapshot.state}`,
      );
    }

    for (const widgetName of ANDROID_TODAY_TASKS_WIDGET_NAMES) {
      await requestWidgetUpdate({
        widgetName,
        renderWidget: (widgetInfo) =>
          React.createElement(TodayTasksWidget, {
            snapshot,
            widgetInfo,
          }),
      });
    }
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("[TodayTasksWidget] Failed to update Android widget cache", error);
    }
  }
}
