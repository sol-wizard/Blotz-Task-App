import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { fetchWithAuth } from "@/shared/services/fetch-with-auth";
import { getStartOfDayUtc } from "../util/date-utils";

const API_BASE_URL = process.env.EXPO_PUBLIC_URL as string;

export async function fetchTasksForDate(date: Date): Promise<TaskDetailDTO[]> {
  const startDateUtc = getStartOfDayUtc(date).toISOString();
  const url = `${API_BASE_URL}/api/Task/due-date?startDateUtc=${encodeURIComponent(startDateUtc)}`;

  const response = await fetchWithAuth(url, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Failed to fetch tasks. Status: ${response.status}`);
  }

  const data = (await response.json()) as TaskDetailDTO[];
  return data;
}

export async function toggleTaskCompletion(taskId: number): Promise<void> {
  const url = `${API_BASE_URL}/api/Task/task-completion-status/${taskId}`;

  const response = await fetchWithAuth(url, { method: "PUT" });

  if (!response.ok) {
    throw new Error(
      `Failed to toggle task completion. Status: ${response.status}`
    );
  }
}
