export function registerTodayTasksWidgetLayout(): void {
  void import("@/feature/widget/ios/components/today-tasks-widget").catch(() => {
    // Widget layout registration is best-effort.
  });
}
