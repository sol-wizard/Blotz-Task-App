import { TaskDTO } from "../models/task-dto";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";

export function mapTaskDtoToDetail(task: TaskDTO): TaskDetailDTO {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    endTime: new Date(task.endTime),
    isDone: task.isDone,
    label: {
      labelId: task.label?.labelId,
      name: task.label?.name as string,
      color: task.label?.color as string,
    },
    hasTime: task.hasTime,
  } satisfies TaskDetailDTO;
}

export function mapTasksDtoToDetails(tasks: TaskDTO[]): TaskDetailDTO[] {
  return tasks.map(mapTaskDtoToDetail);
}


