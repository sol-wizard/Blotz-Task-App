import { HubConnectionState } from '@microsoft/signalr';
import { ConversationMessage } from '../models/chat-message';
import { ChatMessages } from '@/components/ui/chat';
import { MessageList } from '@/components/ui/message-list';
import { Message } from '@/components/ui/chat-message';

type Props = {
  messages: ConversationMessage[];
  connectionState: HubConnectionState;
  isConversationComplete: boolean;
  isBotTyping: boolean;
};

//TODO: Should we use Message instead of ConversationMessage type? Need to change be as wel
const transformToMessages = (conversationMessages: ConversationMessage[]): Message[] => {
  return conversationMessages.map((msg, index) => ({
    id: `${msg.conversationId}-${index}`, // or use a proper unique ID if available
    role: msg.isBot ? 'assistant' : 'user',
    content: msg.content,
  }));
};

export const ChatPanel = ({
  messages,
  connectionState,
  isConversationComplete,
  isBotTyping,
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
          <MessageList messages={transformToMessages(messages)} isTyping={isBotTyping} />
        </ChatMessages>
      )}
    </div>
  );
};
