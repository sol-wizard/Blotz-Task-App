import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { TaskStatusType } from "./task-status-type";

export type TaskFilterGroup = {
  status: TaskStatusType;
  count: number;
  tasks: TaskDetailDTO[];
};
