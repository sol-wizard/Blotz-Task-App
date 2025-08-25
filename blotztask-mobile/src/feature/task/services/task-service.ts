import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { fetchWithAuth } from "@/shared/services/fetch-with-auth";
import { getStartOfDayUtc } from "../util/date-utils";
import { AddTaskItemDTO } from "../models/add-task-item-dto";

const API_BASE_URL = process.env.EXPO_PUBLIC_URL as string;

export async function fetchTasksForDate(date: Date): Promise<TaskDetailDTO[]> {
  const startDateUtc = getStartOfDayUtc(date).toISOString();
  const url = `${API_BASE_URL}/api/Task/by-date?startDateUtc=${encodeURIComponent(startDateUtc)}`;

  const data = await fetchWithAuth<TaskDetailDTO[]>(url, { method: "GET" });
  return data;
}

export async function toggleTaskCompletion(taskId: number): Promise<void> {
  const url = `${API_BASE_URL}/api/Task/task-completion-status/${taskId}`;

  await fetchWithAuth<unknown>(url, { method: "PUT" });
}

export const addTaskItem = async (
  addTaskForm: AddTaskItemDTO
): Promise<TaskDetailDTO> => {
  try {
    const result = await fetchWithAuth<TaskDetailDTO>(
      `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addTaskForm),
      }
    );

    return result;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};
