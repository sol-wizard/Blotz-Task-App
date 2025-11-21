import { useQuery } from "@tanstack/react-query";
import { estimateTaskTime } from "../services/task-time-estimate-service";
import { FloatingTaskForEstimation } from "../models/floating-task-for-estimation";

export const useEstimateTaskTime = (floatingTask: FloatingTaskForEstimation) => {
  const { data: estimatedTime, isLoading } = useQuery({
    queryKey: ["estimateTaskTime", floatingTask.id],
    queryFn: () => estimateTaskTime(floatingTask),
  });

  return {
    estimatedTime,
    isLoading,
  };
};
