import { useMutation } from "@tanstack/react-query";
import { FloatingTaskDTO } from "../models/floating-task-dto";
import { estimateTaskTime } from "../services/task-time-estimate-service";

export const useEstimateTaskTime = () => {
  const estimateMutation = useMutation({
    mutationFn: (task: FloatingTaskDTO) => estimateTaskTime(task),
  });

  return {
    estimateTime: estimateMutation.mutateAsync,
    isEstimating: estimateMutation.isPending,
    timeResult: estimateMutation.data?.duration,
    estimateError: estimateMutation.error,
  };
};
