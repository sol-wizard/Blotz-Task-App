import { TaskDetailDTO } from "@/models/task-detail-dto";

export interface ConversationMessage {
  content: string;
  conversationId: string;
  isBot: boolean;
  sender: string;
  timestamp: string;
  tasks?: TaskDetailDTO[];
}
