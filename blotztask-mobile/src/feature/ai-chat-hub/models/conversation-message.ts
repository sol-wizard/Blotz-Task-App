import { AiTaskDTO } from "./ai-task-dto";

export interface ConversationMessage {
  content: string;
  isBot: boolean;
  tasks?: AiTaskDTO[];
}
