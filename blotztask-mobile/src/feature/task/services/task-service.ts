import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { fetchWithAuth } from "@/shared/services/fetch-with-auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_URL as string; // .env or .env.local?
// debug-log: verify which backend the mobile app is calling
// Note: safe to log since it's just base URL without secrets
// You can remove these logs after verification
console.log('[task-service] API_BASE_URL =', API_BASE_URL);

function getStartOfDayUtc(date: Date): Date {
  // Construct local midnight, then serialize to UTC with toISOString when sending
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export async function fetchTasksForDate(date: Date): Promise<TaskDetailDTO[]> {
  const startDateUtc = getStartOfDayUtc(date).toISOString();
  const url = `${API_BASE_URL}/api/Task/due-date?startDateUtc=${encodeURIComponent(startDateUtc)}`;

  console.log('[task-service] GET', url);
  const response = await fetchWithAuth(url, { method: "GET" });
  console.log('[task-service] GET status', response.status);
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks. Status: ${response.status}`);
  }

  const data = (await response.json()) as Array<{
    id: number;
    title: string;
    description: string;
    endTime: string;  // ISO string
    isDone: boolean;
    label: { labelId?: number; name: string; color: string };
    hasTime: boolean;
  }>;
  console.log('[task-service] fetched tasks count =', Array.isArray(data) ? data.length : 'n/a');

  return data.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    endTime: new Date(t.endTime),
    isDone: t.isDone,
    label: { labelId: t.label?.labelId, name: t.label?.name, color: t.label?.color },
    hasTime: t.hasTime,
  } satisfies TaskDetailDTO));
}

export async function toggleTaskCompletion(taskId: number): Promise<void> {
  const url = `${API_BASE_URL}/api/Task/task-completion-status/${taskId}`;
  console.log('[task-service] PUT', url);
  const response = await fetchWithAuth(url, { method: "PUT" });
  console.log('[task-service] PUT status', response.status);
  if (!response.ok) {
    throw new Error(`Failed to toggle task completion. Status: ${response.status}`);
  }
}
