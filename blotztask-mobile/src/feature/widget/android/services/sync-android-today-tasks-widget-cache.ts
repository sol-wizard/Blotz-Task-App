import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";

import { ANDROID_TODAY_TASKS_WIDGET_NAMES } from "@/feature/widget/config/widget-config";
import type { TaskWidgetCache } from "@/feature/widget/models/task-widget-cache";
import { selectTodayTasksWidgetSnapshot } from "@/feature/widget/util/task-widget-cache-util";
import { getTodayTasksWidgetMessage } from "@/feature/widget/util/today-tasks-widget-message";
import { TodayTasksWidget } from "@/feature/widget/android/components/today-tasks-widget";
import { writeTodayTasksWidgetCache } from "@/feature/widget/android/services/today-tasks-widget-cache-storage";

export async function syncAndroidTodayTasksWidgetCache(cache: TaskWidgetCache): Promise<void> {
  try {
    await writeTodayTasksWidgetCache(cache);

    const snapshot = selectTodayTasksWidgetSnapshot(cache, getTodayTasksWidgetMessage());

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
  } catch {
    // Widget cache updates are best-effort.
  }
}
