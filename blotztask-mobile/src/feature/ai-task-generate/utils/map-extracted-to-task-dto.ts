import uuid from "react-native-uuid";
import { AiTaskDTO } from "../models/ai-task-dto";
import { ExtractedTaskDTO } from "../models/extracted-task-dto";
import { LabelDTO } from "@/shared/models/label-dto";

export function mapExtractedTaskDTOToAiTaskDTO(
  extractedTask: ExtractedTaskDTO,
  labels: LabelDTO[],
): AiTaskDTO {
  const labelName = extractedTask.task_label;

  const rawLabel =
    labelName?.trim() && labels.length > 0
      ? labels.find((l) => l.name.toLowerCase() === labelName.trim().toLowerCase())
      : undefined;

  const label: LabelDTO | undefined = rawLabel
    ? {
        labelId: rawLabel.labelId,
        name: rawLabel.name,
        color: rawLabel.color,
      }
    : undefined;

  return {
    id: uuid.v4().toString(),
    description: extractedTask.description ?? "",
    title: extractedTask.title,
    isAdded: false,
    startTime: extractedTask.start_time,
    endTime: extractedTask.end_time,
    label,
  };
}
