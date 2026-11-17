export type TaskBreakdownJobStatus = "Running" | "Succeeded" | "Failed";

export type TaskBreakdownStatusDTO = {
  taskItemId: number;
  // null when the task has never been broken down.
  status: TaskBreakdownJobStatus | null;
  // Set only when status is "Failed".
  errorCode: string | null;
  // Set only while status is "Running": how long to wait before asking again. The server decides it.
  retryAfterSeconds: number | null;
};
