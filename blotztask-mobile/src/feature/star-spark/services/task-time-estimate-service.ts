import { apiClient } from "@/shared/services/api/client";
import { FloatingTaskForEstimation } from "../models/floating-task-for-estimation";
import { TaskTimeEstimation } from "../models/task-time-estimation";

export const estimateTaskTime = async (
  floatingTask: FloatingTaskForEstimation,
): Promise<TaskTimeEstimation> => {
  try {
    const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/TimeEstimate`;
    const taskTimeEstimation: TaskTimeEstimation = await apiClient.post(url, floatingTask);
    return taskTimeEstimation;
  } catch (error) {
    console.error("Error estimating task time:", error);
    throw new Error("Failed to estimate task time.");
  }
};
