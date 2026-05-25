import { AddSubtaskDTO } from "@/feature/task-details/models/add-subtask-dto";
import { SubtaskDTO } from "../models/subtask-dto";
import { apiClient } from "@/shared/services/api/client";
import { BreakdownResultDTO } from "../models/breakdown-result-dto";
import { AddNewSubtaskDTO } from "../models/add-new-subtask-dto";

export const createBreakDownSubtasks = async (
  taskId: number,
): Promise<BreakdownResultDTO | undefined> => {
  if (!taskId) return;
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/TaskBreakdown/${taskId}`;
  return await apiClient.post(url);
};

export async function addSubtask(newSubtask: AddNewSubtaskDTO): Promise<number> {
  return await apiClient.post<number>("/SubTask", { ...newSubtask });
}


export async function updateSubtask(newSubtask: SubtaskDTO): Promise<void> {
  const taskId = newSubtask.parentTaskId;
  const subtaskId = newSubtask.subTaskId;
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${taskId}/subtasks/${subtaskId}`;

  await apiClient.put(url, { ...newSubtask });
}

export async function replaceSubtasks({
  taskId,
  subtasks,
}: {
  taskId: number;
  subtasks: AddSubtaskDTO[];
}): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${taskId}/replaceSubtasks`;

  await apiClient.post(url, { taskId, subtasks });
}

export async function getSubtasksByParentId(parentId: number): Promise<SubtaskDTO[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${parentId}`;
  return await apiClient.get(url);
}

export async function deleteSubtask(subtaskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/subtasks/${subtaskId}`;
  await apiClient.delete(url);
}

export async function toggleSubtaskStatus(subtaskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/subtask-completion-status/${subtaskId}`;
  await apiClient.put(url);
}
