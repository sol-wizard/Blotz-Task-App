import type { WidgetStarVariant } from "@/feature/widget/models/tasks-widget-snapshot";

// Stars are only drawn on the 4×2 widget; callers skip this for the 2×2.
export function getWidgetStarVariant(taskCount: number): WidgetStarVariant {
  if (taskCount === 0) return "empty";

  return taskCount === 1 ? "single" : "multi";
}
