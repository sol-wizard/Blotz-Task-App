import { SubtaskDTO } from "../../feature/breakdown/models/subtask-dto";
import { fetchWithAuth } from "./fetch-with-auth";

export async function updateSubtask(newSubtask: SubtaskDTO): Promise<void> {
  const taskId = newSubtask.taskId;
  const subtaskId = newSubtask.subtaskId;
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/SubTask/${taskId}/subtasks/${subtaskId}`;

  try {
    await fetchWithAuth<void>(url, { method: "PUT", body: JSON.stringify({ ...newSubtask }) });
  } catch (err: any) {
    console.error("Update subtask failed:", err);
    throw new Error("Update subtask failed");
  }
}
