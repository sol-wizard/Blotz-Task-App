import { ExtractedTaskDTO } from "../modals/extracted-task-dto";
import { AiTaskDTO } from "../modals/ai-task-dto";
import uuid from "react-native-uuid";

export function mapExtractedTaskDTOToAiTaskDTO(extractedTask: ExtractedTaskDTO): AiTaskDTO {
  return {
    //TODO: This is just a temporary id, we not using id for now, just to fulfill the DTO, we will need new dto for it
    id: uuid.v4().toString(),
    description: extractedTask.description ?? "",
    title: extractedTask.title,
    isAdded: false,
    startTime: extractedTask.start_time,
    endTime: extractedTask.end_time,
    labelId: extractedTask.label?.labelId,
  };
}
