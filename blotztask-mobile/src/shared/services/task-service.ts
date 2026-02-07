import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskItemDTO } from "../../feature/task-add-edit/models/edit-task-item-dto";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { apiClient } from "./api/client";

import { DailyTaskIndicatorDTO } from "@/feature/calendar/models/daily-task-indicator-dto";
import { startOfDay } from "date-fns";
import { convertToDateTimeOffset } from "../util/convert-to-datetimeoffset";
import { NoteDTO } from "@/feature/notes/models/note-dto";

export async function fetchTasksForDate(
  date: Date,
  includeFloatingForToday: boolean,
): Promise<TaskDetailDTO[]> {
  const startDate = convertToDateTimeOffset(startOfDay(date));

  const url = `/Task/by-date?startDate=${encodeURIComponent(startDate)}&includeFloatingForToday=${includeFloatingForToday}`;
  try {
    return await apiClient.get(url);
  } catch {
    throw new Error("Failed to fetch tasks for selected day");
  }
}

export async function fetchWeeklyTaskAvailability(date: Date): Promise<DailyTaskIndicatorDTO[]> {
  const monday = convertToDateTimeOffset(startOfDay(date));

  const url = `/Task/weekly-task-availability?monday=${encodeURIComponent(monday)}`;

  try {
    return await apiClient.get(url);
  } catch {
    throw new Error("Failed to fetch weekly task availability.");
  }
}

export async function fetchTaskById(taskId: number): Promise<TaskDetailDTO> {
  const url = `/Task/${taskId}`;
  try {
    return await apiClient.get(url);
  } catch {
    throw new Error("Failed to fetch task by Id.");
  }
}

export async function fetchNotes(query?: string): Promise<NoteDTO[]> {
  const url = `/Task/star-spark-floating-tasks`;
  try {
    const data: NoteDTO[] = await apiClient.get(url, {
      params: query ? { query } : undefined,
    });
    return data;
  } catch {
    throw new Error("Failed to fetch floating tasks for Notes.");
  }
}

export async function toggleTaskCompletion(taskId: number): Promise<void> {
  const url = `/Task/task-completion-status/${taskId}`;

  try {
    await apiClient.put(url);
  } catch {
    throw new Error("Failed to toggle task.");
  }
}

export const addTaskItem = async (addTaskForm: AddTaskItemDTO): Promise<number> => {
  try {
    const url = `/Task`;
    const newTaskId: number = await apiClient.post(url, addTaskForm);
    return newTaskId;
  } catch {
    throw new Error("Failed to add task.");
  }
};

export async function updateTaskItem(taskId: number, updatedTask: EditTaskItemDTO): Promise<void> {
  try {
    const url = `/Task/${taskId}`;
    await apiClient.put(url, updatedTask);
  } catch {
    throw new Error("Failed to update task.");
  }
}

export async function deleteTask(taskId: number): Promise<void> {
  const url = `/Task/${taskId}`;
  try {
    await apiClient.delete(url);
  } catch {
    throw new Error("Failed to delete task.");
  }
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
