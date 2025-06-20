import { Message } from "@/components/ui/chat-message";
import { TaskDetailDTO } from "@/model/task-detail-dto";

export interface MessageWithTasks extends Message {
  tasks?: TaskDetailDTO[];
}