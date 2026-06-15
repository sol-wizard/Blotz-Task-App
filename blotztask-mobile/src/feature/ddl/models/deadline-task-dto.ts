import { LabelDTO } from "@/shared/models/label-dto";
import {
  RecurringOccurrenceIdentityDTO,
  TaskOccurrenceKind,
} from "@/shared/models/task-detail-dto";

export interface DeadlineTaskDTO {
  id: number | null;
  occurrenceKind?: TaskOccurrenceKind;
  recurringOccurrence?: RecurringOccurrenceIdentityDTO | null;
  title: string;
  description?: string | null;
  startTime: string | null;
  endTime: string | null;
  isDone: boolean;
  label?: LabelDTO;
  dueAt: string;
  isPinned: boolean;
}
