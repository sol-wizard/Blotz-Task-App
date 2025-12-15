import { AddTaskItemDTO } from "@/shared/models/add-task-item-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";

// TODO: handle invalid date, need to be changed after backend support (Do we still need this?)
export function convertAiTaskToAddTaskItemDTO(task: AiTaskDTO): AddTaskItemDTO {
  if (!task.startTime || !task.endTime)
    return {
      title: task.title,
      description: task.description,
      labelId: task.label?.labelId,
      timeType: null,
    };
  let timeType = 1;
  if (task.startTime === task.endTime) {
    timeType = 0;
  }
  return {
    title: task.title,
    description: task.description,
    startTime: convertToDateTimeOffset(new Date(task.startTime)),
    endTime: convertToDateTimeOffset(new Date(task.endTime)),
    labelId: task.label?.labelId,
    timeType: timeType,
  };
}
