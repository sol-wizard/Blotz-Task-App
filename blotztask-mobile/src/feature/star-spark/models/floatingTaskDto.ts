import { LabelDTO } from "@/shared/models/label-dto";
import { TaskTimeType } from "@/shared/models/task-detail-dto";

export interface FloatingTaskDTO {
  id: number;
  description?: string;
  title: string;
  isDone: boolean;
  label?: LabelDTO;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
}
