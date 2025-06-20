'use client';

import { LabelDTO } from '@/model/label-dto';

export interface TaskDetailDTO2 {
  id: string;
  description: string;
  title: string;
  isDone: boolean;
  label: LabelDTO;
  dueDate: Date;
  hasTime: boolean;
}
