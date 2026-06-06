export const TASK_DETAIL_ROUTE_MODE = {
  Persisted: "persisted",
  Virtual: "virtual",
} as const;

export type TaskDetailRouteMode =
  (typeof TASK_DETAIL_ROUTE_MODE)[keyof typeof TASK_DETAIL_ROUTE_MODE];

const taskDetailRouteModeValues: readonly string[] = Object.values(TASK_DETAIL_ROUTE_MODE);

export function isTaskDetailRouteMode(value: string | undefined): value is TaskDetailRouteMode {
  return value != null && taskDetailRouteModeValues.includes(value);
}
