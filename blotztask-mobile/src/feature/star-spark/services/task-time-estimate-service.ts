import { apiClient } from "@/shared/services/api/client";
import { FloatingTaskForEstimation } from "../models/floating-task-for-estimation";

export const estimateTaskTime = async (
  floatingTask: FloatingTaskForEstimation,
): Promise<number> => {
  try {
    const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/TimeEstimate`;
    const newTaskId: number = await apiClient.post(url, floatingTask);
    return newTaskId;
  } catch (error) {
    console.error("Error estimating task time:", error);
    throw error;
  }
};
