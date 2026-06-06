import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { RecurringTaskCreateDTO } from "@/shared/models/recurring-task-create-dto";
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
  const url = `/Task`;
  const {
    recurrence: _recurrence,
    recurrenceEndMode: _recurrenceEndMode,
    recurrenceEndDate: _recurrenceEndDate,
    ...taskPayload
  } = addTaskForm;
  return await apiClient.post(url, taskPayload);
};

export const createRecurringTask = async (
  recurringTask: RecurringTaskCreateDTO,
): Promise<number> => {
  const url = `/RecurringTask`;
  return await apiClient.post(url, recurringTask);
};

export async function updateTaskItem(taskId: number, updatedTask: TaskUpsertDTO): Promise<void> {
  const url = `/Task/${taskId}`;
  return await apiClient.put(url, updatedTask);
}

export async function updateRecurringOccurrence(payload: {
  recurringTaskId: number;
  occurrenceDate: string;
  taskDetails: TaskUpsertDTO;
}): Promise<{ taskItemId: number }> {
  return await apiClient.put<{ taskItemId: number }>("/RecurringTask/occurrence", payload);
}

export async function deleteTask(taskId: number): Promise<void> {
  const url = `/Task/${taskId}`;

  return await apiClient.delete(url);
}

export async function getAllTasks(): Promise<TaskDetailDTO[]> {
  const url = `/Task/all`;
  return await apiClient.get(url);
}

export async function saveRecurringOccurrence(payload: {
  recurringTaskId: number;
  occurrenceDate: string;
}): Promise<{ taskItemId: number }> {
  return await apiClient.post<{ taskItemId: number }>("/RecurringTask/occurrence/complete", payload);
}

export async function materializeRecurringOccurrence(payload: {
  recurringTaskId: number;
  occurrenceDate: string;
}): Promise<{ taskItemId: number }> {
  return await apiClient.post<{ taskItemId: number }>(
    "/RecurringTask/occurrence/materialize",
    payload,
  );
}
