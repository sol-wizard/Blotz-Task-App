export interface TaskTimeEstimation {
  taskId: number;
  duration: string;
}

export interface EstimatedTaskTime extends TaskTimeEstimation {
  durationText: string;
  durationMinutes: number;
}
