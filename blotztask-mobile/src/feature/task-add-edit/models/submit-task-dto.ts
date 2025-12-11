export type SubmitTaskDTO = {
  title: string;
  description: string | null;
  startDate: Date | null;
  startTime: Date | null;
  endDate: Date | null;
  endTime: Date | null;
  labelId: number | null;
  notificationId?: string | null;
};
