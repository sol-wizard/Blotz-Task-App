import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TasksWidgetSnapshot } from "@/feature/widget/models/tasks-widget-snapshot";

export const TODAY_TASKS_WIDGET_CACHE_KEY = "blotztask.widget.todayTasksCache.v1";

export async function readTodayTasksWidgetCache(): Promise<Record<
  string,
  TasksWidgetSnapshot
> | null> {
  try {
    const rawCache = await AsyncStorage.getItem(TODAY_TASKS_WIDGET_CACHE_KEY);
    if (!rawCache) return null;

    return JSON.parse(rawCache) as Record<string, TasksWidgetSnapshot>;
  } catch {
    return null;
  }
}
