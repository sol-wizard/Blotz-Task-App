import { LabelDTO } from "@/shared/models/label-dto";

export interface TaskThumbnailDTO {
  taskTitle: string;
  label?: LabelDTO;
}

export interface MonthlyTaskIndicatorDTO {
  date: string;
  taskThumbnails: TaskThumbnailDTO[];
}
