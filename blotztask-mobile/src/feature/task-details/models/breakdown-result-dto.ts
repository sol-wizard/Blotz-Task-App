import { BreakdownSubtaskDTO } from "./breakdown-subtask-dto";

export type BreakdownResultDTO = {
  subtasks: BreakdownSubtaskDTO[];
  isSuccess: boolean;
  errorMessage?: string;
};
