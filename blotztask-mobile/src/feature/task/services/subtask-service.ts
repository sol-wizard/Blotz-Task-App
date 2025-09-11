// This is a mock service simulating fetching subtasks for a given task.
export async function fetchSubtasksForTask(taskId: number): Promise<any[]> {
  const nowIso = new Date().toISOString();

  return [
    {
      id: 1,
      parentTaskId: taskId,
      title: "Define Goals & Project List",
      description: "Define Goals & Project List",
      duration: "01:00:00",
      order: 1,
      isDone: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 2,
      parentTaskId: taskId,
      title: "Content Drafting",
      description: "Draft content for the project",
      duration: "02:00:00",
      order: 2,
      isDone: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 3,
      parentTaskId: taskId,
      title: "Visual Asset Preparation",
      description: "Prepare visuals",
      duration: "02:00:00",
      order: 3,
      isDone: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 4,
      parentTaskId: taskId,
      title: "Platform Update",
      description: "Update platform content",
      duration: "02:00:00",
      order: 4,
      isDone: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 5,
      parentTaskId: taskId,
      title: "Review & Resume Alignment",
      description: "Review and align with resume",
      duration: "01:00:00",
      order: 5,
      isDone: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
}

/* 
// Real service implementation
import { fetchWithAuth } from "@/shared/services/fetch-with-auth";

export async function fetchSubtasksForTask(taskId: number): Promise<any[]> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/Task/${taskId}/subtasks`;
  return fetchWithAuth<any[]>(url, { method: "GET" });
}
*/
