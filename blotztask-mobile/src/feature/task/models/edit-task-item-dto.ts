export interface EditTaskItemDTO {
  id: number;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  labelId: number;
  isDone: boolean;
  timeType?: "single" | "range";
}
