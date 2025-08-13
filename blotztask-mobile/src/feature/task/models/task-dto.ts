export interface TaskDTO {
  id: number;
  title: string;
  description: string;
  endTime: string;  // ISO string
  isDone: boolean;
  label: { labelId?: number; name: string; color: string };
  hasTime: boolean;
}
