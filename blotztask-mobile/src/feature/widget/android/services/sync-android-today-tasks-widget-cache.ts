import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";

import { ANDROID_TASK_WIDGET_NAMES } from "@/feature/widget/config/widget-config";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";
import { selectTodayTasksWidgetSnapshot } from "@/feature/widget/util/task-widget-cache-util";
import { TodayTasksWidget } from "@/feature/widget/android/components/today-tasks-widget";
import { writeTodayTasksWidgetCache } from "@/feature/widget/android/services/today-tasks-widget-cache-service";
import i18n from "@/i18n";

export async function syncAndroidTodayTasksWidgetCache(
  cache: Record<string, TasksWidgetSnapshot>,
): Promise<void> {
  try {
    await writeTodayTasksWidgetCache(cache);

    const snapshot = selectTodayTasksWidgetSnapshot(cache, {
      title: i18n.t("widget:today.title"),
      emptyMessage: i18n.t("widget:today.emptyMessage"),
    });

    for (const widgetName of ANDROID_TASK_WIDGET_NAMES) {
      await requestWidgetUpdate({
        widgetName,
        renderWidget: (widgetInfo) =>
          React.createElement(TodayTasksWidget, {
            snapshot,
            isSmallWidget: widgetInfo.width < 220,
          }),
      });
    }
  } catch {
    // Widget cache updates are best-effort.
  }
}
