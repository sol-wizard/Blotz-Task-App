import { Message } from "@/components/ui/chat-message";
import { ExtractedTask } from "@/model/extracted-task-dto";

export interface MessageWithTasks extends Message {
  tasks?: ExtractedTask[];
}