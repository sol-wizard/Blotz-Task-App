export type TaskWidgetSnapshotItem = {
  taskId: number | null;
  title: string;
  timeLabel: string;
  deepLink: string;
};

export type TasksWidgetSnapshot = {
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
  footerText: string;
};
