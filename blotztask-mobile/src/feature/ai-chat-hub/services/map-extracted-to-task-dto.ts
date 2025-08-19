import { ExtractedTaskDTO } from "../models/extracted-task-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import uuid from "react-native-uuid";

export function mapExtractedTaskDTOToAiTaskDTO(
  extractedTask: ExtractedTaskDTO
): AiTaskDTO {
  return {
    //TODO: This is just a temporary id, we not using id for now, just to fulfill the DTO, we will need new dto for it
    id: uuid.v4().toString(),
    description: extractedTask.description ?? "",
    title: extractedTask.title,
    isAdded: false,
    hasTime: false,
    endTime: extractedTask.endTime,
    labelId: extractedTask.label?.labelId,
  };
}
