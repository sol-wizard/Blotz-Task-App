export interface EditTaskItemDTO {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  isDone: boolean;
  labelId: number;
  hasTime: boolean;
}
