import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { requestWidgetUpdate } from "react-native-android-widget";
import { format } from "date-fns";

import {
  ANDROID_TASK_WIDGET_NAMES,
  TODAY_TASKS_WIDGET_CACHE_KEY,
} from "@/feature/widget/config/widget-config";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/tasks-widget-snapshot";
import { buildTodayTasksWidgetSnapshot } from "@/feature/widget/util/today-tasks-widget-snapshot-util";
import { TodayTasksWidget } from "@/feature/widget/android/components/android-tasks-widget";
import i18n from "@/i18n";

export async function syncAndroidTodayTasksWidgetCache(
  snapshots: TasksWidgetSnapshot[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(TODAY_TASKS_WIDGET_CACHE_KEY, JSON.stringify(snapshots));

    const cacheDate = format(new Date(), "yyyy-MM-dd");
    const widgetMessage = {
      title: i18n.t("widget:today.title"),
      emptyMessage: i18n.t("widget:today.emptyMessage"),
    };
    const snapshot =
      snapshots.find((cachedSnapshot) => cachedSnapshot.cacheDate === cacheDate) ??
      buildTodayTasksWidgetSnapshot(cacheDate, [], widgetMessage);

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
