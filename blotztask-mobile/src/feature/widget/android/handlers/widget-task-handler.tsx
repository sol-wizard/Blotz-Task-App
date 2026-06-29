import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { isTodayTasksAndroidWidgetName } from "@/feature/widget/config/widget-config";
import { selectTodayTasksWidgetSnapshot } from "@/feature/widget/util/task-widget-cache-util";
import { getTodayTasksWidgetMessage } from "@/feature/widget/util/today-tasks-widget-message";
import { readTodayTasksWidgetCache } from "@/feature/widget/android/services/today-tasks-widget-cache-storage";
import { TodayTasksWidget } from "@/feature/widget/android/components/today-tasks-widget";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (!isTodayTasksAndroidWidgetName(props.widgetInfo.widgetName)) return;
  if (props.widgetAction === "WIDGET_DELETED") return;

  try {
    const cache = await readTodayTasksWidgetCache();
    const snapshot = selectTodayTasksWidgetSnapshot(cache, getTodayTasksWidgetMessage());

    props.renderWidget(<TodayTasksWidget snapshot={snapshot} widgetInfo={props.widgetInfo} />);
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn("[TodayTasksWidget] Failed to render Android widget task", error);
    }
  }
}
