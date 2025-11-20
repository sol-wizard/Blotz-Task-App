import { LabelDTO } from "@/shared/models/label-dto";

export interface AiTaskDTO {
  id: string;
  description: string;
  title: string;
  isAdded: boolean;
  startTime: string;
  endTime: string;
  label?: LabelDTO;
}
