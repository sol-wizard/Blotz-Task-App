import { SubTask } from "./subtask";

// Message structure for breakdown chat
export interface BreakdownMessage {
  content: string;
  isBot: boolean;
  subtasks?: SubTask[];
}
