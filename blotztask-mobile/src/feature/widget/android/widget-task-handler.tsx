import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { TODAY_TASKS_WIDGET_NAME } from "@/feature/widget/config/widget-config";
import { selectTodayTasksWidgetSnapshot } from "@/feature/widget/models/task-widget-cache";
import { readTodayTasksWidgetCache } from "@/feature/widget/services/today-tasks-widget-cache";
import { TodayTasksWidget } from "@/feature/widget/android/today-tasks-widget";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== TODAY_TASKS_WIDGET_NAME) return;
  if (props.widgetAction === "WIDGET_DELETED") return;

  const cache = await readTodayTasksWidgetCache();
  const snapshot = selectTodayTasksWidgetSnapshot(cache);

  props.renderWidget(<TodayTasksWidget snapshot={snapshot} widgetInfo={props.widgetInfo} />);
}
