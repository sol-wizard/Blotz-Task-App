import { BreakdownSubtaskDTO } from "./breakdown-subtask-dto";

// Message structure for breakdown chat
export interface BreakdownMessage {
  content: string;
  isBot: boolean;
  subtasks?: BreakdownSubtaskDTO[];
}
