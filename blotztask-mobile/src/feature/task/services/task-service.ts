import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { fetchWithAuth } from "@/shared/services/fetch-with-auth";
import { getStartOfDayUtc } from "../util/date-utils";
import { EditTaskItemDTO } from "../../task-add-edit/models/edit-task-item-dto";
import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";

export async function fetchTasksForDate(
  date: Date,
  includeFloatingForToday: boolean,
): Promise<TaskDetailDTO[]> {
  const startDateUtc = getStartOfDayUtc(date).toISOString();

  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/by-date?startDateUtc=${encodeURIComponent(startDateUtc)}&includeFloatingForToday=${includeFloatingForToday}`;

  const data = await fetchWithAuth<TaskDetailDTO[]>(url, { method: "GET" });
  return data;
}

export async function fetchTaskById(taskId: number): Promise<TaskDetailDTO> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/${taskId}`;
  const taskData = await fetchWithAuth<TaskDetailDTO>(url, { method: "GET" });
  return taskData;
}

export async function fetchFloatingTasks(): Promise<TaskDetailDTO[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/floating`;

  const data = await fetchWithAuth<TaskDetailDTO[]>(url, { method: "GET" });
  return data;
}

export async function fetchOverdueTasks(): Promise<TaskDetailDTO[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/overdue`;

  const data = await fetchWithAuth<TaskDetailDTO[]>(url, { method: "GET" });
  return data;
}

export async function toggleTaskCompletion(taskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/task-completion-status/${taskId}`;

  await fetchWithAuth<unknown>(url, { method: "PUT" });
}

export const addTaskItem = async (addTaskForm: AddTaskItemDTO): Promise<number> => {
  try {
    const newTaskId = await fetchWithAuth<number>(`${process.env.EXPO_PUBLIC_URL_WITH_API}/Task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(addTaskForm),
    });

    return newTaskId;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};

export async function updateTaskItem(updatedTask: EditTaskItemDTO): Promise<void> {
  try {
    await fetchWithAuth<any>(`${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/${updatedTask.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedTask),
    });
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

export async function deleteTask(taskId: number): Promise<void> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/${taskId}`;
  try {
    await fetchWithAuth<void>(url, { method: "DELETE" });
  } catch (err: any) {
    console.error("deleteTask failed:", err);
    throw new Error("Delete task failed");
  }
}
