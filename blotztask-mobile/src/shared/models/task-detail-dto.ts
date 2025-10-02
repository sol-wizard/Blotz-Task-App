import { TaskTimeType } from "@/feature/task-add-edit/util/time-type-mapper";
import { LabelDTO } from "./label-dto";

export interface TaskDetailDTO {
  id: number;
  description?: string;
  title: string;
  isDone: boolean;
  label?: LabelDTO;
  startTime?: string;
  endTime?: string;
  timeType?: TaskTimeType;
}
