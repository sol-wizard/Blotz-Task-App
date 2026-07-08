export const IOS_TASK_WIDGET_NAME = "BlotzTaskIOSTaskWidget";
export const ANDROID_TASK_WIDGET_NAMES = [
  "BlotzTaskAndroidTaskMediumWidget",
  "BlotzTaskAndroidTaskSmallWidget",
] as const;
export const APP_LINK = "blotztask://";

export function isAndroidTaskWidgetName(widgetName: string): boolean {
  return ANDROID_TASK_WIDGET_NAMES.some((androidTaskWidgetName) => {
    return androidTaskWidgetName === widgetName;
  });
}
