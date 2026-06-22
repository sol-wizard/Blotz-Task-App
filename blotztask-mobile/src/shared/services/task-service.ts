import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import {
  CreateRecurringTaskResultDTO,
  RecurringTaskCreateDTO,
} from "@/shared/models/recurring-task-create-dto";
import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { apiClient } from "./api/client";
import { DailyTaskIndicatorDTO } from "@/feature/calendar/models/daily-task-indicator-dto";
import { MonthlyTaskIndicatorDTO } from "@/feature/monthly-calendar/models/monthly-task-indicator-dto";
import { format } from "date-fns";

// Returns the device's current IANA timezone ID (e.g. "Australia/Sydney").
// Used for current-location features so the backend resolves day boundaries in the user's local time.
function deviceTimeZoneId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function fetchTasksForDate(date: Date): Promise<TaskDetailDTO[]> {
  const dateStr = format(date, "yyyy-MM-dd");
  const url = `/Task/by-date?date=${dateStr}&timeZoneId=${encodeURIComponent(deviceTimeZoneId())}`;
  return apiClient.get(url);
}

export async function fetchWeeklyTaskAvailability(date: Date): Promise<DailyTaskIndicatorDTO[]> {
  const dateStr = format(date, "yyyy-MM-dd");
  const url = `/Task/weekly-task-availability?weekStart=${dateStr}&timeZoneId=${encodeURIComponent(deviceTimeZoneId())}`;
  return apiClient.get(url);
}

export async function fetchMonthlyTaskAvailability(date: Date): Promise<MonthlyTaskIndicatorDTO[]> {
  const dateStr = format(date, "yyyy-MM-dd");
  const url = `/Task/monthly-task-availability?firstDate=${dateStr}&timeZoneId=${encodeURIComponent(deviceTimeZoneId())}`;
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
