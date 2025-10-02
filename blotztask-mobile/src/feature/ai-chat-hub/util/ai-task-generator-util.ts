import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { AiTaskDTO } from "../models/ai-task-dto";

export function convertAiTaskToAddTaskItemDTO(task: AiTaskDTO): AddTaskItemDTO {
  if (!task.startTime || !task.endTime)
    return {
      title: task.title,
      description: task.description,
      labelId: task.labelId,
    };
  let timeType = 1;
  if (task.startTime === task.endTime) {
    timeType = 0;
  }
  return {
    title: task.title,
    description: task.description,
    startTime: new Date(task.startTime),
    endTime: new Date(task.endTime),
    labelId: task.labelId,
    timeType: timeType,
  };
}
