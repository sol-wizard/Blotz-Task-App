import type { TasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";

export type TaskWidgetCache = {
  generatedAt: string;
  days: Record<string, TasksWidgetSnapshot>;
};
