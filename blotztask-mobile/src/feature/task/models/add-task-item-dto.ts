export interface AddTaskItemDTO {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  labelId: number;
}
