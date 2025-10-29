import { AddSubtaskDTO } from "@/feature/task-details/models/add-subtask-dto";
import { SubtaskDTO } from "../models/subtask-dto";
import { apiClient } from "@/shared/services/api-client";
import { BreakdownSubtaskDTO } from "@/feature/task-details/models/breakdown-subtask-dto";

export const createBreakDownSubtasks = async (taskId: number) => {
  if (!taskId) return;

  try {
    const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/TaskBreakdown/${taskId}`;
    const data: BreakdownSubtaskDTO = await apiClient.post(url);
    return data;
  } catch (error) {
    console.error("Error fetching subtasks:", error);
  }
};

export async function updateSubtask(newSubtask: SubtaskDTO): Promise<void> {
  const taskId = newSubtask.subTaskId;
  const subtaskId = newSubtask.parentTaskId;
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/${taskId}/subtasks/${subtaskId}`;

  try {
    await apiClient.put(url, JSON.stringify({ ...newSubtask }));
  } catch (err: any) {
    console.error("Update subtask failed:", err);
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
    await apiClient.post(url, JSON.stringify({ taskId, subtasks }));
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
