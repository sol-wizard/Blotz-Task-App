import { TaskUpsertDTO } from "@/shared/models/task-upsert-dto";
import { TaskTimeType } from "@/shared/models/base-task-dto";
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
      timeType: TaskTimeType.Single,
      notificationId: null,
      isDeadline: false,
    };
  }
  const timeType = task.startTime === task.endTime ? TaskTimeType.Single : TaskTimeType.Range;
  return {
    title: task.title,
    description: task.description,
    startTime: convertToDateTimeOffset(new Date(task.startTime)),
    endTime: convertToDateTimeOffset(new Date(task.endTime)),
    labelId: task.label?.labelId,
    timeType,
    notificationId: null,
    isDeadline: false,
  };
}
