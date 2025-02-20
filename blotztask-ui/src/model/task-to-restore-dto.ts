import { LabelDTO } from '@/model/label-dto';

export interface TaskToRestoreDTO {
  description: string;
  title: string;
  isDone: boolean;
  labelId: number;
  dueDate: Date;
}
