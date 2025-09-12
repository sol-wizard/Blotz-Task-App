import { AddSubtaskDTO } from "@/feature/breakdown/models/add-subtask-dto";
import { SubtaskDTO } from "../../feature/breakdown/models/subtask-dto";
import { fetchWithAuth } from "./fetch-with-auth";

export async function updateSubtask(newSubtask: SubtaskDTO): Promise<void> {
  const taskId = newSubtask.taskId;
  const subtaskId = newSubtask.subtaskId;
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/${taskId}/subtasks/${subtaskId}`;

  try {
    await fetchWithAuth<void>(url, { method: "PUT", body: JSON.stringify({ ...newSubtask }) });
  } catch (err: any) {
    console.error("Update subtask failed:", err);
    throw new Error("Update subtask failed");
  }
}

export async function addSubtasks({
  taskId,
  subtasks,
}: {
  taskId: number;
  subtasks: AddSubtaskDTO[];
}): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/tasks/${taskId}/subtasks`;

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
