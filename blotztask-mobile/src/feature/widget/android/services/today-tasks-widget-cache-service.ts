import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TasksWidgetSnapshot } from "@/feature/widget/models/today-tasks-widget-snapshot";

const TODAY_TASKS_WIDGET_CACHE_KEY = "blotztask.widget.todayTasksCache.v1";

export async function writeTodayTasksWidgetCache(
  cache: Record<string, TasksWidgetSnapshot>,
): Promise<void> {
  await AsyncStorage.setItem(TODAY_TASKS_WIDGET_CACHE_KEY, JSON.stringify(cache));
}

export async function readTodayTasksWidgetCache(): Promise<Record<string, TasksWidgetSnapshot> | null> {
  try {
    const rawCache = await AsyncStorage.getItem(TODAY_TASKS_WIDGET_CACHE_KEY);
    if (!rawCache) return null;

    const parsed: unknown = JSON.parse(rawCache);
    return parsed as Record<string, TasksWidgetSnapshot>;
  } catch {
    return null;
  }
}
