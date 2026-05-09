import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { apiClient } from "./api/client";

import { DailyTaskIndicatorDTO } from "@/feature/calendar/models/daily-task-indicator-dto";
import { MonthlyTaskIndicatorDTO } from "@/feature/monthly-calendar/models/monthly-task-indicator-dto";
import { startOfDay } from "date-fns";
import { convertToDateTimeOffset } from "../util/convert-to-datetimeoffset";

export async function fetchTasksForDate(
  date: Date,
  includeFloatingForToday: boolean,
): Promise<TaskDetailDTO[]> {
  const startDate = convertToDateTimeOffset(startOfDay(date));

  const url = `/Task/by-date?startDate=${encodeURIComponent(startDate)}&includeFloatingForToday=${includeFloatingForToday}`;
  return apiClient.get(url);
}

export async function fetchWeeklyTaskAvailability(date: Date): Promise<DailyTaskIndicatorDTO[]> {
  const monday = convertToDateTimeOffset(startOfDay(date));

  const url = `/Task/weekly-task-availability?monday=${encodeURIComponent(monday)}`;
  return apiClient.get(url);
}

export async function fetchMonthlyTaskAvailability(date: Date): Promise<MonthlyTaskIndicatorDTO[]> {
  const firstDate = convertToDateTimeOffset(startOfDay(date));

  const url = `/Task/monthly-task-availability?firstDate=${encodeURIComponent(firstDate)}`;
  return apiClient.get(url);
}

export async function fetchTaskById(taskId: number): Promise<TaskDetailDTO> {
  const url = `/Task/${taskId}`;

  return await apiClient.get(url);
}

export async function toggleTaskCompletion(taskId: number): Promise<void> {
  const url = `/Task/task-completion-status/${taskId}`;

  await apiClient.put(url);
}

export const addTaskItem = async (addTaskForm: TaskUpsertDTO): Promise<number> => {
  try {
    const url = `/Task`;
    const newTaskId: number = await apiClient.post(url, addTaskForm);
    return newTaskId;
  } catch {
    throw new Error("Failed to add task.");
  }
};

export async function updateTaskItem(taskId: number, updatedTask: TaskUpsertDTO): Promise<void> {
  const url = `/Task/${taskId}`;
  return await apiClient.put(url, updatedTask);
}

export async function deleteTask(taskId: number): Promise<void> {
  const url = `/Task/${taskId}`;

  return await apiClient.delete(url);
}

export async function getAllTasks(): Promise<TaskDetailDTO[]> {
  const url = `/Task/all`;
  try {
    const data: TaskDetailDTO[] = await apiClient.get(url);
    return data;
  } catch {
    throw new Error("Failed to fetch all tasks.");
  }
}

export async function saveRecurringOccurrence(payload: {
  recurringTaskId: number;
  occurrenceDate: string;
}): Promise<{ taskItemId: number }> {
  try {
    return await apiClient.post("/RecurringTask/occurrence/complete", payload);
  } catch {
    throw new Error("Failed to save recurring occurrence.");
  }
}
