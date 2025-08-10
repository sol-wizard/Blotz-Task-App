import { LabelDTO } from "./label-dto";

export interface TaskDetailDTO {
  id: number;
  description: string;
  title: string;
  isDone: boolean;
  label: LabelDTO;
  endTime: Date;
  hasTime: boolean;
}
