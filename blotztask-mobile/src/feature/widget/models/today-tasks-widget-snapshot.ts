export enum TaskWidgetSnapshotState {
  Placeholder = "placeholder",
  Content = "content",
  Empty = "empty",
  Fallback = "fallback",
}

export type TaskWidgetSnapshotItem = {
  taskId: number | null;
  title: string;
  timeLabel: string;
  deepLink: string;
};

export type TasksWidgetSnapshot = {
  state: TaskWidgetSnapshotState;
  dateKey: string;
  title: string;
  message: string;
  footerText: string;
  openAppDeepLink: string;
  tasks: TaskWidgetSnapshotItem[];
};

export type TodayTasksWidgetMessage = {
  title: string;
  emptyMessage: string;
  placeholderMessage: string;
  fallbackMessage: string;
  footerText: string;
};
