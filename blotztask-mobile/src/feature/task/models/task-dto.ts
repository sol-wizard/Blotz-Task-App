import { TaskLabelDTO } from './task-label-dto';

export interface TaskDTO {
  id: number;
  title: string;
  description: string;
  startTime: string;  // ISO string
  endTime: string;  // ISO string
  isDone: boolean;
  label: TaskLabelDTO;
  hasTime: boolean;
}
