export interface EditTaskItemDTO {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  labelId: number;
  timeType?: "single" | "range";
}
