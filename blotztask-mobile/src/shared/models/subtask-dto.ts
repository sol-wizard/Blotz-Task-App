export interface SubtaskDTO {
  taskId: number;
  subtaskId: number;
  title?: string;
  description?: string;
  duration?: string;
  isDone?: boolean;
}
