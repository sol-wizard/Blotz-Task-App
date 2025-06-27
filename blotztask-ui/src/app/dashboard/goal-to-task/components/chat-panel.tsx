import { HubConnectionState } from '@microsoft/signalr';
import { ChatMessages } from '@/components/ui/chat';
import { MessageList } from '@/components/ui/message-list';
import { MessageWithTasks } from '../models/message-with-tasks';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import ChatStartScreen from './chat-start-screen';

type Props = {
  messagesWithTasks: MessageWithTasks[];
  connectionState: HubConnectionState;
  isConversationComplete: boolean;
  isBotTyping: boolean;
  onTaskAdded: (task: TaskDetailDTO) => void;
  appendToChat: (messageToSend: string) => Promise<void>;
};

export const ChatPanel = ({
  messagesWithTasks,
  connectionState,
  isConversationComplete,
  isBotTyping,
  onTaskAdded,
  appendToChat,
}: Props) => {
  return (
    <div className="flex-1 overflow-auto p-4">
      {messagesWithTasks.length === 0 && connectionState === HubConnectionState.Connected ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          {isConversationComplete ? (
            'This conversation is complete. Start a new one to continue.'
          ) : (
            <ChatStartScreen appendToChat={appendToChat} />
          )}
        </div>
      ) : connectionState === HubConnectionState.Connecting ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          Connecting to chat service...
        </div>
      ) : (
        <ChatMessages messages={[]}>
          <MessageList messagesWithTasks={messagesWithTasks} isTyping={isBotTyping} onTaskAdd={onTaskAdded} />
        </ChatMessages>
      )}
    </div>
  );
};
