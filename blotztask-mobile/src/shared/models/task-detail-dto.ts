import { LabelDTO } from "./label-dto";

export enum TaskTimeType {
  Single = 0,
  Range = 1,
}

export interface TaskDetailDTO {
  id: number;
  description?: string;
  title: string;
  isDone: boolean;
  label?: LabelDTO;
  startTime?: string;
  endTime?: string;
  timeType?: TaskTimeType;
}
