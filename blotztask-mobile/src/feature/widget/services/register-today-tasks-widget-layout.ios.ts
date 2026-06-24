export function registerTodayTasksWidgetLayout(): void {
  void import("@/feature/widget/ios/today-tasks-widget").catch((error: unknown) => {
    if (__DEV__) {
      console.warn("[TodayTasksWidget] Failed to register widget layout", error);
    }
  });
}
