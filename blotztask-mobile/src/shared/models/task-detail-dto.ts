import { LabelDTO } from "./label-dto";

export interface TaskDetailDTO {
  id: number;
  description: string;
  title: string;
  isDone: boolean;
  label: LabelDTO;
  startTime: string;
  endTime: string;
  hasTime: boolean;
}
