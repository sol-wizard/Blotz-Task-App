import { useMutation } from "@tanstack/react-query";
import { FloatingTaskDTO } from "../models/floating-task-dto";
import { TaskTimeEstimation } from "../models/task-time-estimation";
import { estimateTaskTime } from "../services/task-time-estimate-service";
import { convertSubtaskTimeForm } from "@/feature/task-details/utils/convert-subtask-time-form";



type EstimateTaskTimeError = Error;

export const useEstimateTaskTime = () => {
  return useMutation<TaskTimeEstimation, EstimateTaskTimeError, FloatingTaskDTO>({
    mutationFn: async (task: FloatingTaskDTO) => {
      const result = await estimateTaskTime({
        id: task.id,
        title: task.title,
        description: task.description,
      });

      const durationText = convertSubtaskTimeForm(result.duration);

      if (!durationText) {
        throw new Error("Could not estimate time, please try again later.");
      }

      return { ...result, duration: durationText };
    },
  });
};