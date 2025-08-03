export interface EditTaskItemDTO {
  id: number;
  title: string;
  description: string;
  endTime: string;
  isDone: boolean;
  labelId: number;
  hasTime: boolean;
}
