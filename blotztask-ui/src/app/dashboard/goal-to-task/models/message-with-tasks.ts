import { Message } from "@/components/ui/chat-message";
import { TaskDetailDTO2 } from "@/model/task-detail-dto-2";

export interface MessageWithTasks extends Message {
  tasks?: TaskDetailDTO2[];
}