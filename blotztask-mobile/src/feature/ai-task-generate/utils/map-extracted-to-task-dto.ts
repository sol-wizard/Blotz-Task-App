import uuid from "react-native-uuid";
import { isValid, parseISO } from "date-fns";
import { AiTaskDTO } from "../models/ai-task-dto";
import { ExtractedTaskDTO } from "../models/extracted-task-dto";
import { LabelDTO } from "@/shared/models/label-dto";

function sanitizeISOTime(raw: string | undefined): string {
  if (!raw) return "";
  const parsed = parseISO(raw);
  return isValid(parsed) ? raw : "";
}

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
    startTime: sanitizeISOTime(extractedTask.start_time),
    endTime: sanitizeISOTime(extractedTask.end_time),
    label,
  };
}
