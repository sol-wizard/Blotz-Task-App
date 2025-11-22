import { LabelDTO } from "@/shared/models/label-dto";

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
