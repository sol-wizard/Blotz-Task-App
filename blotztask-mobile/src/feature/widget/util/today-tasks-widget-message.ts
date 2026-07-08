import i18n from "@/i18n";
import type { TodayTasksWidgetMessage } from "@/feature/widget/models/today-tasks-widget-snapshot";

export function getTodayTasksWidgetMessage(): TodayTasksWidgetMessage {
  return {
    title: i18n.t("widget:today.title"),
    emptyMessage: i18n.t("widget:today.emptyMessage"),
    footerText: i18n.t("widget:today.footerText"),
  };
}
