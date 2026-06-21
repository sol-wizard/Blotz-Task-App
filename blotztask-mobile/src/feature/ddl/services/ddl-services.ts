import { apiClient } from "@/shared/services/api/client";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";

export async function getAllDdlTasks(): Promise<DeadlineTaskDTO[]> {
  // TIMEZONE TODO: Align with timezone-handling.md Rule 2, Rule 5, and Rule 6.
  // Deadline "today" should send request/device timeZoneId, not a precomputed now
  // DateTimeOffset, so the backend derives local today from the timezone.
  const now = encodeURIComponent(convertToDateTimeOffset(new Date()));
  return apiClient.get(`/Deadline/all?now=${now}`);
}

export async function updatePin(taskId: number, isPinned: boolean): Promise<void> {
  await apiClient.patch(`/Deadline/${taskId}/pin`, { taskId, isPinned });
}

export async function deleteDeadlineTask(taskId: number): Promise<void> {
  await apiClient.delete(`/Deadline/${taskId}`);
}
