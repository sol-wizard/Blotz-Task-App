import {
  ChatMessage,
  type ChatMessageProps,
  type Message,
} from "@/components/ui/chat-message"
import { TypingIndicator } from "@/components/ui/typing-indicator"
import { MessageWithTasks } from "@/app/dashboard/goal-to-task/models/message-with-tasks"
import ChatInlineTaskcard from "@/app/dashboard/goal-to-task/components/chat-inline-taskcard"
import { TaskDetailDTO } from "@/model/task-detail-dto"

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof Message>

interface MessageWithTasksListProps {
  messagesWithTasks: MessageWithTasks[]
  showTimeStamps?: boolean
  isTyping?: boolean
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: Message) => AdditionalMessageOptions)
  onTaskAdd?:(task: TaskDetailDTO) => void;
}

export function MessageList({
  messagesWithTasks,
  showTimeStamps = true,
  isTyping = false,
  onTaskAdd,
}: MessageWithTasksListProps) {
  return (
    <div className="space-y-4 overflow-visible">
      {messagesWithTasks.map((message, index) => {
        if (message.tasks) {
          return (
            <>
              {message.tasks.map((task, ind) => (
                <ChatInlineTaskcard key={ind} task={task} onTaskAdded={onTaskAdd} />
              ))}
            </>
          )
        }

        return (
          <ChatMessage
            key={index}
            showTimeStamp={showTimeStamps}
            {...message}
          />
        )
      })}
      {isTyping && <TypingIndicator />}
    </div>
  )
}
