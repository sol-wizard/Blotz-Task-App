export interface AiTaskDTO {
  id: string;
  description: string;
  title: string;
  isAdded: boolean;
  endTime: string;
  hasTime: boolean;
  labelId?: number;
}
