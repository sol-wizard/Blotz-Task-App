export type TaskWidgetSnapshotItem = {
  taskId: number | null;
  title: string;
  time: string;
  link: string;
};

export type TasksWidgetSnapshot = {
  cacheDate: string;
  title: string;
  message: string;
  appLink: string;
  tasks: TaskWidgetSnapshotItem[];
};
