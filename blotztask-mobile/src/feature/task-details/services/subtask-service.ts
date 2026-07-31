import { SubtaskDTO } from "../models/subtask-dto";
import { apiClient } from "@/shared/services/api/client";
import { BreakdownAndReplaceTaskResultDTO } from "../models/breakdown-result-dto";
import { AddNewSubtaskDTO } from "../models/add-new-subtask-dto";

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

export const breakDownAndReplaceTaskSubtasks = async (
  target: BreakdownTaskTarget,
): Promise<BreakdownAndReplaceTaskResultDTO> => {
  return await apiClient.post("/TaskBreakdown", target);
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
