export const IOS_TASK_WIDGET_NAME = "BlotzTaskIOSTaskWidget";
export const ANDROID_TASK_WIDGET_NAMES = [
  "BlotzTaskAndroidTaskMediumWidget",
  "BlotzTaskAndroidTaskSmallWidget",
] as const;
export const TASK_WIDGET_OPEN_APP_DEEP_LINK = "blotztask://";
export const TASK_WIDGET_FUTURE_DAY_COUNT = 7;

export function isAndroidTaskWidgetName(widgetName: string): boolean {
  return ANDROID_TASK_WIDGET_NAMES.some((androidTaskWidgetName) => {
    return androidTaskWidgetName === widgetName;
  });
}
