import { BreakdownSubtaskDTO } from "./breakdown-subtask-dto";

export type BreakdownMessageDTO = {
  subtasks: BreakdownSubtaskDTO[];
  isSuccess: boolean;
  errorMessage?: string;
};
