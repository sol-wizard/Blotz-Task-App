import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import {
  CreateRecurringTaskResultDTO,
  RecurringTaskCreateDTO,
} from "@/shared/models/recurring-task-create-dto";
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
  // TIMEZONE TODO: Align with timezone-handling.md Core Rule, Rule 2, Rule 4, and Rule 7.
  // Calendar requests should send local date + request/device timeZoneId instead of a
  // precomputed startDate DateTimeOffset. Remove includeFloatingForToday with the API cleanup.
  const startDate = convertToDateTimeOffset(startOfDay(date));

  const url = `/Task/by-date?startDate=${encodeURIComponent(startDate)}&includeFloatingForToday=${includeFloatingForToday}`;
  return apiClient.get(url);
}

export async function fetchWeeklyTaskAvailability(date: Date): Promise<DailyTaskIndicatorDTO[]> {
  // TIMEZONE TODO: Align with timezone-handling.md Rule 2, Rule 5, and Rule 7.
  // Weekly availability should send local week anchor date + request/device timeZoneId,
  // letting the backend resolve timezone-aware boundaries.
  const monday = convertToDateTimeOffset(startOfDay(date));

  const url = `/Task/weekly-task-availability?monday=${encodeURIComponent(monday)}`;
  return apiClient.get(url);
}

export async function fetchMonthlyTaskAvailability(date: Date): Promise<MonthlyTaskIndicatorDTO[]> {
  // TIMEZONE TODO: Align with timezone-handling.md Rule 2, Rule 5, and Rule 7.
  // Monthly view page availability should send local month anchor date + request/device timeZoneId,
  // letting the backend resolve timezone-aware boundaries.
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
): Promise<CreateRecurringTaskResultDTO> => {
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

export async function updateRecurringTaskFuture(payload: {
  recurringTaskId: number;
  effectiveDate: string;
  taskDetails: TaskUpsertDTO;
  stopRepeating: boolean;
  frequency?: RecurringTaskCreateDTO["frequency"];
  interval?: number;
  daysOfWeek?: number | null;
  dayOfMonth?: number | null;
  endDate?: string | null;
  endDateChanged: boolean;
  scheduleTimeZoneId?: string | null;
  deadlineTimeZoneId?: string | null;
}): Promise<{ recurringTaskId: number | null }> {
  return await apiClient.put<{ recurringTaskId: number | null }>("/RecurringTask/future", payload);
}

export async function deleteRecurringOccurrence(payload: {
  recurringTaskId: number;
  occurrenceDate: string;
  deleteFuture: boolean;
}): Promise<void> {
  return await apiClient.post<void>("/RecurringTask/occurrence/delete", payload);
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
