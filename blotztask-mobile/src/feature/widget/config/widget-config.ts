export const IOS_TASK_WIDGET_NAME = "BlotzTaskIOSTaskWidget";
export const ANDROID_TASK_WIDGET_NAMES = [
  "BlotzTaskAndroidTaskMediumWidget",
  "BlotzTaskAndroidTaskSmallWidget",
] as const;
export const TODAY_TASKS_WIDGET_CACHE_KEY = "blotztask.widget.todayTasksCache.v1";
export const APP_LINK = "blotztask://";

// Exported from Figma at 3x; width/height are the display size in dp/pt.
export const WIDGET_STAR_IMAGES = {
  empty: {
    source: require("../../../../assets/images-png/widget-stars-empty.png"),
    width: 56,
    height: 55,
  },
  single: {
    source: require("../../../../assets/images-png/widget-stars-single.png"),
    width: 109,
    height: 105,
  },
  multi: {
    source: require("../../../../assets/images-png/widget-stars-multi.png"),
    width: 109,
    height: 121,
  },
} as const;
