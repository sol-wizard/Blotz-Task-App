import { ExtractedTaskDTO } from "../models/extracted-task-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import uuid from "react-native-uuid";

export function mapExtractedToTaskDetail(
  extractedTask: ExtractedTaskDTO
): AiTaskDTO {
  return {
    //TODO: This is just a temporary id, we not using id for now, just to fulfill the DTO, we will need new dto for it
    id: uuid.v4().toString(),
    description: extractedTask.description ?? "",
    title: extractedTask.title,
    isAdded: false,
    hasTime: true,
    endTime: new Date(extractedTask.due_date ?? ""),
    labelId: extractedTask.label?.labelId ?? 6,
  };
}
