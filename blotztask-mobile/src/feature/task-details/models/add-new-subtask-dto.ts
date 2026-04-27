export interface AddNewSubtaskDTO {
  parentTaskId: number;
  title: string;
  duration?: string; // "HH:mm:ss"
  order: number;
}