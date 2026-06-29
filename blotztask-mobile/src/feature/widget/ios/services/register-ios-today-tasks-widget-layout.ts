export function registerIosTodayTasksWidgetLayout(): void {
  void import("@/feature/widget/ios/components/today-tasks-widget").catch((error: unknown) => {
    if (__DEV__) {
      console.warn("[TodayTasksWidget] Failed to register iOS widget layout", error);
    }
  });
}
