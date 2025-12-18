import { useMutation } from "@tanstack/react-query";
import { FloatingTaskDTO } from "../models/floating-task-dto";
import { EstimatedTaskTime, TaskTimeEstimation } from "../models/task-time-estimation";
import { estimateTaskTime } from "../services/task-time-estimate-service";
import { convertSubtaskTimeForm } from "@/feature/task-details/utils/convert-subtask-time-form";

type EstimateTaskTimeError = Error;

const convertDurationToMinutes = (duration: string): number => {
  const [hours, minutes, seconds] = duration.split(":").map(Number);
  return hours * 60 + minutes + Math.ceil(seconds / 60);
};

export const useEstimateTaskTime = () => {
  return useMutation<EstimatedTaskTime, EstimateTaskTimeError, FloatingTaskDTO>({
    mutationFn: async (task: FloatingTaskDTO) => {
      const result = await estimateTaskTime({
        id: task.id,
        title: task.title,
        description: task.description,
      });

      const durationText = convertSubtaskTimeForm(result.duration);
      const durationMinutes = convertDurationToMinutes(result.duration);

      if (!durationText || !Number.isFinite(durationMinutes)) {
        throw new Error("Could not estimate time, please try again later.");
      }

      return { ...result, durationText, durationMinutes };
    },
  });
};
