import { AddSubtaskDTO } from "@/feature/task-details/models/add-subtask-dto";
import { SubtaskDTO } from "../models/subtask-dto";
import { fetchWithAuth } from "../../../shared/services/fetch-with-auth";
import { BreakdownSubtaskDTO } from "@/feature/task-details/models/breakdown-subtask-dto";

export const createBreakDownSubtasks = async (taskId: number) => {
  if (!taskId) return;

  try {
    const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/TaskBreakdown/${taskId}`;
    const data: BreakdownSubtaskDTO[] = await fetchWithAuth(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return data;
  } catch (error) {
    console.error("Error fetching subtasks:", error);
  }
};

export async function updateSubtask(newSubtask: SubtaskDTO): Promise<void> {
  const taskId = newSubtask.parentTaskId;
  const subtaskId = newSubtask.subTaskId;
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${taskId}/subtasks/${subtaskId}`;

  try {
    await fetchWithAuth<void>(url, { method: "PUT", body: JSON.stringify({ ...newSubtask }) });
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
    await fetchWithAuth<void>(url, {
      method: "POST",
      body: JSON.stringify({ taskId, subtasks }),
    });
  } catch (err: any) {
    console.error("Add subtasks failed:", err);
    throw new Error("Add subtasks failed");
  }
}

export async function getSubtasksByParentId(parentId: number): Promise<SubtaskDTO[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${parentId}`;
  try {
    const data: SubtaskDTO[] = await fetchWithAuth(url, {
      method: "GET",
    });
    return data;
  } catch (error) {
    console.error("Error fetching subtasks by parent ID:", error);
    return [];
  }
}

export async function deleteSubtask(subtaskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/subtasks/${subtaskId}`;
  try {
    await fetchWithAuth<void>(url, {
      method: "DELETE",
    });
  } catch (err: any) {
    console.error("Error deleting subtask:", err);
    throw new Error("Delete subtask failed:", err);
  }
}
