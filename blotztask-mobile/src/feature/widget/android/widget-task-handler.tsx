import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import {
  buildTodayTasksWidgetPlaceholderSnapshot,
  TODAY_TASKS_WIDGET_NAME,
} from "@/feature/widget/models/today-tasks-widget-snapshot";
import { readTodayTasksWidgetSnapshot } from "@/feature/widget/services/today-tasks-widget-cache";
import { TodayTasksWidget } from "@/feature/widget/android/today-tasks-widget";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== TODAY_TASKS_WIDGET_NAME) return;
  if (props.widgetAction === "WIDGET_DELETED") return;

  const snapshot =
    (await readTodayTasksWidgetSnapshot()) ?? buildTodayTasksWidgetPlaceholderSnapshot();

  props.renderWidget(<TodayTasksWidget snapshot={snapshot} widgetInfo={props.widgetInfo} />);
}
