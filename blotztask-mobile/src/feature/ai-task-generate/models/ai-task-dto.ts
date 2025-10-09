export interface AiTaskDTO {
  id: string;
  description: string;
  title: string;
  isAdded: boolean;
  startTime: string;
  endTime: string;
  labelId?: number;
}
