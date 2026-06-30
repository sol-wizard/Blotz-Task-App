export function registerIosTodayTasksWidgetLayout(): void {
  void import("@/feature/widget/ios/components/today-tasks-widget").catch(() => {
    // Widget layout registration is best-effort.
  });
}
