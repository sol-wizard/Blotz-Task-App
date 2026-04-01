import { apiClient } from "@/shared/services/api/client";
import { DeadlineTaskDTO } from "../models/deadline-task-dto";

export async function getAllDdlTasks(): Promise<DeadlineTaskDTO[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Deadline/all`;
  try {
    const data: DeadlineTaskDTO[] = await apiClient.get(url);
    return data;
  } catch (err) {
    console.error("Error fetching DDL tasks:", err);
    throw new Error("Fetch DDL tasks failed");
  }
}

export async function updatePin(taskId: number, isPinned: boolean): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Deadline/${taskId}/pin`;
  try {
    await apiClient.patch(url, { isPinned });
  } catch (err) {
    console.error("Error updating pin:", err);
    throw new Error("Update pin failed");
  }
}

export async function deleteDeadlineTask(taskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Deadline/${taskId}`;
  try {
    await apiClient.delete(url);
  } catch (err) {
    console.error("Error deleting deadline task:", err);
    throw new Error("Delete deadline task failed");
  }
}
