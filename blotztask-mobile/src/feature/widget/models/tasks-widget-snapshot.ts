export type TaskWidgetSnapshotItem = {
  title: string;
  time: string;
  link: string;
};

export type WidgetStarVariant = "empty" | "single" | "multi";

export type WidgetStarImage = {
  uri: string;
  width: number;
  height: number;
};

export type TasksWidgetSnapshot = {
  cacheDate: string;
  title: string;
  dateTitle: string;
  message: string;
  appLink: string;
  tasks: TaskWidgetSnapshotItem[];
  // iOS only: the widget can't read app assets, so this points at a copy in the shared widgets folder.
  starImage?: WidgetStarImage;
};
