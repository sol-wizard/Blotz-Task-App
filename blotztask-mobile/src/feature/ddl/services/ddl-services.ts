import { apiClient } from "@/shared/services/api/client";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";

export async function getAllDdlTasks(): Promise<DeadlineTaskDTO[]> {
  return apiClient.get("/Deadline/all");
}

export async function updatePin(taskId: number, isPinned: boolean): Promise<void> {
  await apiClient.patch(`/Deadline/${taskId}/pin`, { taskId, isPinned });
}

export async function deleteDeadlineTask(taskId: number): Promise<void> {
  await apiClient.delete(`/Deadline/${taskId}`);
}
