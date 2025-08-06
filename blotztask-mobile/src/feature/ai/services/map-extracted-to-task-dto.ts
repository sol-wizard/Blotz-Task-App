import { TaskDetailDTO } from "@/models/task-detail-dto";
import { ExtractedTask } from "../models/extracted-task.dto";

export function mapExtractedToTaskDetail(
  extractedTask: ExtractedTask
): TaskDetailDTO {
  return {
    //TODO: This is just a temporary id, we not using id for now, just to fulfill the DTO, we will need new dto for it
    id: Date.now() + Math.floor(Math.random() * 10),
    description: extractedTask.description ?? "",
    title: extractedTask.title,
    isDone: false,
    label: extractedTask.label ?? { labelId: 0, name: "", color: "" },
    endTime: new Date(extractedTask.due_date ?? ""),
    hasTime: false,
  };
}
