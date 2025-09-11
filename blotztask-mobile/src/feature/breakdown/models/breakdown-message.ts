import { AddSubtaskDTO } from "./addSubtaskDTO";

// Message structure for breakdown chat
export interface BreakdownMessage {
  content: string;
  isBot: boolean;
  subtasks?: AddSubtaskDTO[];
}
