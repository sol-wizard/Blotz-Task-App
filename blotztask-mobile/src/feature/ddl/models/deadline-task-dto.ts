import { LabelDTO } from "@/shared/models/label-dto";

export interface DeadlineTaskDTO {
  id: number;
  title: string;
  startTime: string | null;
  endTime: string | null;
  isDone: boolean;
  label?: LabelDTO;
  dueAt: string;
  isPinned: boolean;
}
