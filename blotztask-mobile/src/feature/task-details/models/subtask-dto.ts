export interface SubtaskDTO {
  subTaskId: number;
  parentTaskId: number;
  title: string;
  description?: string;
  duration?: string;
  order: number;
  isDone: boolean;
}
