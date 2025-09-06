import { ExtractedTaskDTO } from "../models/extracted-task-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import uuid from "react-native-uuid";

//TODO: Rename file and move to util
<<<<<<< HEAD:blotztask-mobile/src/feature/ai-chat-hub/util/map-extracted-to-task-dto.ts
export function mapExtractedTaskDTOToAiTaskDTO(extractedTask: ExtractedTaskDTO): AiTaskDTO {
=======
export function mapExtractedTaskDTOToAiTaskDTO(
  extractedTask: ExtractedTaskDTO
): AiTaskDTO {
>>>>>>> 6eb4676 (Frontend refactor (#467)):blotztask-mobile/src/feature/ai-chat-hub/services/map-extracted-to-task-dto.ts
  return {
    //TODO: This is just a temporary id, we not using id for now, just to fulfill the DTO, we will need new dto for it
    id: uuid.v4().toString(),
    description: extractedTask.description ?? "",
    title: extractedTask.title,
    isAdded: false,
    hasTime: false,
    startTime: extractedTask.start_time,
    endTime: extractedTask.end_time,
    labelId: extractedTask.label?.labelId,
  };
}
