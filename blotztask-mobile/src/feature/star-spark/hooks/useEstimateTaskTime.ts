import { useQueryClient } from "@tanstack/react-query";
import { FloatingTaskDTO } from "../models/floating-task-dto";
import { estimateTaskTime } from "../services/task-time-estimate-service";
import { useState } from "react";
import { estimateKeys } from "@/shared/constants/query-key-factory";
import { TaskTimeEstimation } from "../models/task-time-estimation";

export const useEstimateTaskTime = () => {
  const queryClient = useQueryClient();

  const [isEstimating, setIsEstimating] = useState(false);
  const [timeResult, setTimeResult] = useState<string | undefined>(undefined);
  const [estimateError, setEstimateError] = useState<unknown>(null);

  const estimateTime = async (task: FloatingTaskDTO) => {
    setIsEstimating(true);
    setEstimateError(null);

    try {
      const data = await queryClient.fetchQuery<TaskTimeEstimation>({
        queryKey: estimateKeys.taskTime(task),
        queryFn: () => estimateTaskTime(task),
        meta: { silent: true },
      });

      setTimeResult(data?.duration);
      return data;
    } catch (err) {
      setEstimateError(err);
      throw err;
    } finally {
      setIsEstimating(false);
    }
  };

  return {
    estimateTime,
    isEstimating,
    timeResult,
    estimateError,
  };
};
