import TaskPreviewCard from "@/app/dashboard/goal-to-task/components/task=preview-card"
import {
  ChatMessage,
  MessageWithTasks,
  type ChatMessageProps,
  type Message,
} from "@/components/ui/chat-message"
import { TypingIndicator } from "@/components/ui/typing-indicator"
import { ExtractedTask } from "@/model/extracted-task-dto"

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof Message>

// interface MessageListProps {
//   messages: Message[]
//   showTimeStamps?: boolean
//   isTyping?: boolean
//   messageOptions?:
//     | AdditionalMessageOptions
//     | ((message: Message) => AdditionalMessageOptions)
// }
interface MessageWithTasksListProps {
  messages: MessageWithTasks[]
  showTimeStamps?: boolean
  isTyping?: boolean
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: Message) => AdditionalMessageOptions)
  onTaskAdd?:(task: ExtractedTask) => void;
}

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  messageOptions,
  onTaskAdd,
}: MessageWithTasksListProps) {
  return (
    <div className="space-y-4 overflow-visible">
      {messages.map((message, index) => {
        const additionalOptions =
          typeof messageOptions === "function"
            ? messageOptions(message)
            : messageOptions
        if (message.tasks) {
          return (
            <>
              {message.tasks.map((task, ind) => (
                <TaskPreviewCard key={ind} task={task} onTaskAdded={onTaskAdd} />
              ))}
            </>
          )
        }

        return (
          <ChatMessage
            key={index}
            showTimeStamp={showTimeStamps}
            {...message}
            {...additionalOptions}
          />
        )
      })}
      {isTyping && <TypingIndicator />}
    </div>
  )
}
