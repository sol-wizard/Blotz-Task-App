import { HubConnectionState } from '@microsoft/signalr';
import { ChatMessages } from '@/components/ui/chat';
import { MessageList } from '@/components/ui/message-list';
import { MessageWithTasks } from '@/components/ui/chat-message';
import { ExtractedTask } from '@/model/extracted-task-dto';

type Props = {
  messages: MessageWithTasks[];
  connectionState: HubConnectionState;
  isConversationComplete: boolean;
  isBotTyping: boolean;
  onTaskAdded: (task: ExtractedTask) => void;
};

export const ChatPanel = ({
  messages,
  connectionState,
  isConversationComplete,
  isBotTyping,
  onTaskAdded,
}: Props) => {
  return (
    <div className="flex-1 overflow-auto p-4">
      {messages.length === 0 && connectionState === HubConnectionState.Connected ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          {isConversationComplete
            ? 'This conversation is complete. Start a new one to continue.'
            : 'Describe your goal to get started. The assistant will help break it down into tasks.'}
        </div>
      ) : connectionState === HubConnectionState.Connecting ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          Connecting to chat service...
        </div>
      ) : (
        <ChatMessages messages={[]}>
          <MessageList messages={messages} isTyping={isBotTyping} onTaskAdd={onTaskAdded} />
        </ChatMessages>
      )}
    </div>
  );
};
