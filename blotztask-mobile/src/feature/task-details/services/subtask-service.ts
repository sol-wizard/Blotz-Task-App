import { SubtaskDTO } from "../models/subtask-dto";
import { apiClient } from "@/shared/services/api/client";
import { AddNewSubtaskDTO } from "../models/add-new-subtask-dto";
import { TaskBreakdownStatusDTO } from "../models/task-breakdown-status-dto";

export type BreakdownTaskTarget =
  | {
      taskId: number;
      recurringTaskId?: never;
      occurrenceDate?: never;
    }
  | {
      taskId?: never;
      recurringTaskId: number;
      occurrenceDate: string;
    };

// Starts the breakdown in the background and returns at once; poll getTaskBreakdownStatus for the result.
export const startTaskBreakdown = async (
  target: BreakdownTaskTarget,
): Promise<TaskBreakdownStatusDTO> => {
  return await apiClient.post("/TaskBreakdown/start", target);
};

export const getTaskBreakdownStatus = async (
  taskItemId: number,
): Promise<TaskBreakdownStatusDTO> => {
  return await apiClient.get(`/TaskBreakdown/${taskItemId}/status`);
};

export async function addSubtask(newSubtask: AddNewSubtaskDTO): Promise<number> {
  return await apiClient.post<number>("/SubTask", { ...newSubtask });
}

export async function updateSubtask(newSubtask: SubtaskDTO): Promise<void> {
  const taskId = newSubtask.parentTaskId;
  const subtaskId = newSubtask.subTaskId;
  const url = `/SubTask/tasks/${taskId}/subtasks/${subtaskId}`;

  await apiClient.put(url, { ...newSubtask });
}

export async function getSubtasksByParentId(parentId: number): Promise<SubtaskDTO[]> {
  const url = `/SubTask/tasks/${parentId}`;
  return await apiClient.get(url);
}

export async function deleteSubtask(subtaskId: number): Promise<void> {
  const url = `/SubTask/subtasks/${subtaskId}`;
  await apiClient.delete(url);
}

export async function toggleSubtaskStatus(subtaskId: number): Promise<void> {
  const url = `/SubTask/subtask-completion-status/${subtaskId}`;
  await apiClient.put(url);
}
