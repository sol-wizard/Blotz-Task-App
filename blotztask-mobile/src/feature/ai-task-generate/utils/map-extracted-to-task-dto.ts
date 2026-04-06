import { parseISO, format } from "date-fns";
import { ExtractedTaskDTO } from "../models/ai-result-message-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import { LabelDTO } from "@/shared/models/label-dto";

const stripOffset = (isoString: string): string =>
  format(parseISO(isoString.replace(/(\.\d+)?([+-]\d{2}:\d{2}|Z)$/, "")), "yyyy-MM-dd'T'HH:mm:ss");

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
    id: extractedTask.id,
    description: extractedTask.description ?? "",
    title: extractedTask.title,
    startTime: stripOffset(extractedTask.start_time),
    endTime: stripOffset(extractedTask.end_time),
    label,
  };
}
