import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { selectTodayTasksWidgetSnapshot } from "@/feature/widget/util/task-widget-cache-util";
import { readTodayTasksWidgetCache } from "@/feature/widget/android/services/today-tasks-widget-cache-service";
import { TodayTasksWidget } from "@/feature/widget/android/components/today-tasks-widget";
import i18n from "@/i18n";

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetAction === "WIDGET_DELETED") return;

  try {
    const cache = await readTodayTasksWidgetCache();
    const snapshot = selectTodayTasksWidgetSnapshot(cache, {
      title: i18n.t("widget:today.title"),
      emptyMessage: i18n.t("widget:today.emptyMessage"),
      footerText: i18n.t("widget:today.footerText"),
    });

    props.renderWidget(
      <TodayTasksWidget snapshot={snapshot} isSmallWidget={props.widgetInfo.width < 220} />,
    );
  } catch {
    // Widget rendering is best-effort.
  }
}
