import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { EditTaskItemDTO } from "../../feature/task-add-edit/models/edit-task-item-dto";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { apiClient } from "./api/client";
import { FloatingTaskDTO } from "@/feature/star-spark/models/floating-task-dto";
import { DailyTaskIndicatorDTO } from "@/feature/calendar/models/daily-task-indicator-dto";
import { startOfDay } from "date-fns";

export async function fetchTasksForDate(
  date: Date,
  includeFloatingForToday: boolean,
): Promise<TaskDetailDTO[]> {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const startDateUtc = startOfDay.toISOString();

  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/by-date?startDateUtc=${encodeURIComponent(startDateUtc)}&includeFloatingForToday=${includeFloatingForToday}`;

  const data: TaskDetailDTO[] = await apiClient.get(url);

  return data;
}

export async function fetchWeeklyTaskAvailability(date: Date): Promise<DailyTaskIndicatorDTO[]> {
  const mondayUtc = startOfDay(date).toISOString();

  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/weekly-task-availability?mondayUtc=${mondayUtc}`;

  const data: DailyTaskIndicatorDTO[] = await apiClient.get(url);

  return data;
}

export async function fetchTaskById(taskId: number): Promise<TaskDetailDTO> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/${taskId}`;
  const taskData: TaskDetailDTO = await apiClient.get(url);
  return taskData;
}

export async function fetchFloatingTasks(): Promise<FloatingTaskDTO[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/floating`;
  const data: TaskDetailDTO[] = await apiClient.get(url);
  console.log("fetchFloatingTasks data:", data);
  return data;
}

export async function toggleTaskCompletion(taskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/task-completion-status/${taskId}`;
  await apiClient.put(url);
}

export const addTaskItem = async (addTaskForm: AddTaskItemDTO): Promise<number> => {
  try {
    const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task`;
    const newTaskId: number = await apiClient.post(url, addTaskForm);
    return newTaskId;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};

export async function updateTaskItem(updatedTask: EditTaskItemDTO): Promise<void> {
  try {
    const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/${updatedTask.id}`;
    await apiClient.put(url, updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

export async function deleteTask(taskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/${taskId}`;
  try {
    await apiClient.delete(url);
  } catch (err: any) {
    console.error("deleteTask failed:", err);
    throw new Error("Delete task failed");
  }
}

export async function getAllTasks(): Promise<TaskDetailDTO[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/all`;
  const data: TaskDetailDTO[] = await apiClient.get(url);
  return data;
}
