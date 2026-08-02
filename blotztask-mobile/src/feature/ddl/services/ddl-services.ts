import { apiClient } from "@/shared/services/api/client";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";

function deviceTimeZoneId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function getAllDdlTasks(): Promise<DeadlineTaskDTO[]> {
  const timeZoneId = encodeURIComponent(deviceTimeZoneId());
  return apiClient.get(`/Deadline/all?timeZoneId=${timeZoneId}`);
}

export async function updatePin(taskId: number, isPinned: boolean): Promise<void> {
  await apiClient.patch(`/Deadline/${taskId}/pin`, { taskId, isPinned });
}

export async function deleteDeadlineTask(taskId: number): Promise<void> {
  await apiClient.delete(`/Deadline/${taskId}`);
}
