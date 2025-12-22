import { AddSubtaskDTO } from "@/feature/task-details/models/add-subtask-dto";
import { SubtaskDTO } from "../models/subtask-dto";
import { BreakdownSubtaskDTO } from "@/feature/task-details/models/breakdown-subtask-dto";
import { apiClient } from "@/shared/services/api/client";

export const createBreakDownSubtasks = async (
  taskId: number,
): Promise<BreakdownSubtaskDTO[] | undefined> => {
  if (!taskId) return;
  try {
    const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/TaskBreakdown/${taskId}`;
    const data: BreakdownSubtaskDTO[] = await apiClient.post(url);
    return data;
  } catch {
    throw new Error("Error fetching subtasks");
  }
};

export async function updateSubtask(newSubtask: SubtaskDTO): Promise<void> {
  const taskId = newSubtask.parentTaskId;
  const subtaskId = newSubtask.subTaskId;
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${taskId}/subtasks/${subtaskId}`;

  try {
    await apiClient.put(url, { ...newSubtask });
  } catch (err: any) {
    throw new Error("Update subtask failed");
  }
}

export async function replaceSubtasks({
  taskId,
  subtasks,
}: {
  taskId: number;
  subtasks: AddSubtaskDTO[];
}): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${taskId}/replaceSubtasks`;

  try {
    await apiClient.post(url, { taskId, subtasks });
  } catch (err: any) {
    console.error("Add subtasks failed:", err);
    throw new Error("Add subtasks failed");
  }
}

export async function getSubtasksByParentId(parentId: number): Promise<SubtaskDTO[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${parentId}`;
  try {
    const data: SubtaskDTO[] = await apiClient.get(url);
    return data;
  } catch (error) {
    console.error("Error fetching subtasks by parent ID:", error);
    return [];
  }
}

export async function deleteSubtask(subtaskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/subtasks/${subtaskId}`;
  try {
    await apiClient.delete(url);
  } catch (err) {
    console.error("Error deleting subtask:", err);
    throw new Error("Delete subtask failed");
  }
}

export async function toggleSubtaskStatus(subtaskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/subtask-completion-status/${subtaskId}`;
  try {
    await apiClient.put(url);
  } catch (err) {
    console.error("Error toggling subtask status:", err);
    throw new Error("Toggle subtask status failed");
  }
}
