export const TODAY_TASKS_WIDGET_NAME = "TodayTasksWidget";
export const TODAY_TASKS_SMALL_WIDGET_NAME = "TodayTasksSmallWidget";
export const ANDROID_TODAY_TASKS_WIDGET_NAMES = [
  TODAY_TASKS_WIDGET_NAME,
  TODAY_TASKS_SMALL_WIDGET_NAME,
] as const;
export const TASK_WIDGET_OPEN_APP_DEEP_LINK = "blotztask://";
export const TASK_WIDGET_FUTURE_DAY_COUNT = 7;

export function isTodayTasksAndroidWidgetName(widgetName: string): boolean {
  return (ANDROID_TODAY_TASKS_WIDGET_NAMES as readonly string[]).includes(widgetName);
}
