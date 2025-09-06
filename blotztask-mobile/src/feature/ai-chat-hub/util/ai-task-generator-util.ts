import { AddTaskItemDTO } from "@/feature/task/models/add-task-item-dto";
import { AiTaskDTO } from "../models/ai-task-dto";

export function convertAiTaskToAddTaskItemDTO(task: AiTaskDTO): AddTaskItemDTO {
  return {
    title: task.title,
    description: task.description,
    startTime: new Date(),
    endTime: new Date(task.endTime), // TODO: when endTime is null it will have 400 error
    hasTime: false,
    labelId: task.labelId ?? 6, // TODO: change it to ai generated task label
  };
}
