import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { format } from "date-fns";
import { TODAY_TASKS_WIDGET_CACHE_KEY } from "@/feature/widget/config/widget-config";
import type { TasksWidgetSnapshot } from "@/feature/widget/models/tasks-widget-snapshot";
import { buildTodayTasksWidgetSnapshot } from "@/feature/widget/util/today-tasks-widget-snapshot-util";
import { TodayTasksWidget } from "@/feature/widget/android/components/android-tasks-widget";
import i18n from "@/i18n";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetAction === "WIDGET_DELETED") return;

  try {
    let cache: Record<string, TasksWidgetSnapshot> | null = null;
    const rawCache = await AsyncStorage.getItem(TODAY_TASKS_WIDGET_CACHE_KEY).catch(() => null);

    if (rawCache) {
      try {
        cache = JSON.parse(rawCache) as Record<string, TasksWidgetSnapshot>;
      } catch {
        cache = null;
      }
    }

    const cacheDate = format(new Date(), "yyyy-MM-dd");
    const widgetMessage = {
      title: i18n.t("widget:today.title"),
      emptyMessage: i18n.t("widget:today.emptyMessage"),
    };
    const snapshot =
      cache?.[cacheDate] ?? buildTodayTasksWidgetSnapshot(cacheDate, [], widgetMessage);

    props.renderWidget(
      <TodayTasksWidget snapshot={snapshot} isSmallWidget={props.widgetInfo.width < 220} />,
    );
  } catch {
    // Widget rendering is best-effort.
  }
}
