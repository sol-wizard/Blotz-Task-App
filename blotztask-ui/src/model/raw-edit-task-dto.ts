export interface RawEditTaskDTO {
  id: number;
  title: string;
  description: string;
  isDone: boolean;
  labelId: number;
  date: Date;
  time: string;
}