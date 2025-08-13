import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { fetchWithAuth } from "@/shared/services/fetch-with-auth";
import { TaskDTO } from "../models/task-dto";

const API_BASE_URL = process.env.EXPO_PUBLIC_URL as string; 

function getStartOfDayUtc(date: Date): Date {
  // Construct local midnight, then serialize to UTC with toISOString when sending
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export async function fetchTasksForDate(date: Date): Promise<TaskDetailDTO[]> {
  const startDateUtc = getStartOfDayUtc(date).toISOString();
  const url = `${API_BASE_URL}/api/Task/due-date?startDateUtc=${encodeURIComponent(startDateUtc)}`;

  const response = await fetchWithAuth(url, { method: "GET" });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks. Status: ${response.status}`);
  }

  const data = (await response.json()) as TaskDTO[];


  return data.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    endTime: new Date(t.endTime),
    isDone: t.isDone,
    label: { labelId: t.label?.labelId, name: t.label?.name, color: t.label?.color },
    hasTime: t.hasTime,
  } satisfies TaskDetailDTO)); // neo: satisfies
}

export async function toggleTaskCompletion(taskId: number): Promise<void> {
  const url = `${API_BASE_URL}/api/Task/task-completion-status/${taskId}`;

  const response = await fetchWithAuth(url, { method: "PUT" });

  if (!response.ok) {
    throw new Error(`Failed to toggle task completion. Status: ${response.status}`);
  }
}

