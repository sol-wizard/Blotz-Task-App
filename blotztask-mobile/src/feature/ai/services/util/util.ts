import { AddTaskItemDTO } from "@/feature/task/models/add-task-item-dto";
import { AiTaskDTO } from "../../models/ai-task-dto";
import { TaskDetailsDto } from "@/feature/breakdown/models/task-details-dto";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import uuid from "react-native-uuid";
import { SubTask } from "@/feature/breakdown/models/subtask";

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

export function convertSubTasksDtoToAiTaskDTO(
  tasks: SubTask[] | undefined
): AiTaskDTO[] {
  if (tasks === undefined) return [];

  return tasks.map((t) => {
    return {
      id: uuid.v4().toString(),
      description: "default description",
      title: t.title,
      isAdded: false,
      endTime: new Date().toISOString(),
      hasTime: false,
    } as AiTaskDTO;
  });
}
