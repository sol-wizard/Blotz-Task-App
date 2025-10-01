import { AddTaskItemDTO } from "@/feature/task/models/add-task-item-dto";
import { AiTaskDTO } from "../models/ai-task-dto";

export function convertAiTaskToAddTaskItemDTO(task: AiTaskDTO): AddTaskItemDTO {
  return {
    title: task.title,
    description: task.description,
    startTime: new Date(task.startTime),
    endTime: new Date(task.endTime),
    labelId: task.labelId,
    timeType: 1,
  };
}
