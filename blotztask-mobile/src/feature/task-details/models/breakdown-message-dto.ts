import { BreakdownSubtaskDTO } from "./breakdown-subtask-dto";

export type BreakdownMessageDTO = {
  subTasks: BreakdownSubtaskDTO[];
  isSuccess: boolean;
  errorMessage?: string;
};
