type RepeatEnum = "none" | "daily" | "weekly" | "monthly";
export interface EditTaskItemDTO {
  id: number;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  labelId: number;
  isDone: boolean;
  repeat: RepeatEnum;
}
