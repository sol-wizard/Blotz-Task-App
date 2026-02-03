import { ExtensionStorage } from "@bacons/apple-targets";

export const widgetStorage = new ExtensionStorage("group.com.Blotz.BlotzTask.widget");
export const TASK_STORAGE_KEY = "widget_today_tasks";

export type WidgetTask = {
  id: string;
  title: string;
  isDone: string;
};
