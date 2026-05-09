import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";

// TODO: handle invalid date, need to be changed after backend support (Do we still need this?)
export function convertAiTaskToTaskUpsertDTO(task: AiTaskDTO): TaskUpsertDTO {
  // TODO: Remove this fallback once the backend supports note
  if (!task.startTime || !task.endTime) {
    const now = new Date();
    return {
      title: task.title,
      description: task.description,
      startTime: convertToDateTimeOffset(now),
      endTime: convertToDateTimeOffset(now),
      labelId: task.label?.labelId,
      timeType: 0,
      isDeadline: false,
    };
  }
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
    isDeadline: false,
  };
}
