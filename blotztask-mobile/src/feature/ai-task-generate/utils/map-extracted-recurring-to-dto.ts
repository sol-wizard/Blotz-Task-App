import { parseISO, format } from "date-fns";
import { ExtractedRecurringTaskDTO } from "../models/ai-result-message-dto";
import { AiRecurringTaskDTO } from "../models/ai-recurring-task-dto";
import { LabelDTO } from "@/shared/models/label-dto";
import { TaskTimeType } from "@/shared/models/base-task-dto";
import { RecurrenceFrequency } from "@/shared/models/recurring-task-create-dto";
import { formatRecurrenceSummary } from "./format-recurrence-summary";

// Strip any timezone offset the AI may append, keeping a naive local wall-clock string
// (mirrors map-extracted-to-task-dto).
const stripOffset = (isoString: string): string =>
  format(parseISO(isoString.replace(/(\.\d+)?([+-]\d{2}:\d{2}|Z)$/, "")), "yyyy-MM-dd'T'HH:mm:ss");

export function mapExtractedRecurringToDTO(
  extracted: ExtractedRecurringTaskDTO,
  labels: LabelDTO[],
): AiRecurringTaskDTO {
  const labelName = extracted.task_label;
  const rawLabel =
    labelName?.trim() && labels.length > 0
      ? labels.find((l) => l.name.toLowerCase() === labelName.trim().toLowerCase())
      : undefined;

  const label: LabelDTO | undefined = rawLabel
    ? { labelId: rawLabel.labelId, name: rawLabel.name, color: rawLabel.color }
    : undefined;

  const templateStartTime = stripOffset(extracted.template_start_time);
  const templateEndTime = stripOffset(extracted.template_end_time);

  return {
    id: extracted.id,
    title: extracted.title,
    description: extracted.description ?? "",
    label,
    timeType: extracted.time_type as TaskTimeType,
    templateStartTime,
    templateEndTime,
    frequency: extracted.frequency as RecurrenceFrequency,
    interval: extracted.interval,
    daysOfWeek: extracted.days_of_week,
    dayOfMonth: extracted.day_of_month,
    // Derive startDate from the template date part so it always satisfies the endpoint's
    // StartDate == TemplateStartTime.Date invariant (same trick as the manual flow).
    startDate: templateStartTime.slice(0, 10),
    endDate: extracted.end_date,
    scheduleSummary: formatRecurrenceSummary({
      frequency: extracted.frequency,
      interval: extracted.interval,
      daysOfWeek: extracted.days_of_week,
      dayOfMonth: extracted.day_of_month,
      templateStartTime,
    }),
  };
}
