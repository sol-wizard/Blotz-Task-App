import { HubConnectionState } from "@microsoft/signalr";
import { ChatMessageList } from "./chat-message-list";
import { ChatRenderMessage } from "../models/chat-message";

type Props = {
  messages: ChatRenderMessage[];
  userName: string;
  connectionState: HubConnectionState;
  isConversationComplete: boolean;
};

export const ChatPanel = ({
  messages,
  userName,
  connectionState,
  isConversationComplete,
}: Props) => {
  return (
    <div className="flex-1 overflow-auto p-4">
      {messages.length === 0 && connectionState === HubConnectionState.Connected ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          {isConversationComplete
            ? "This conversation is complete. Start a new one to continue."
            : "Describe your goal to get started. The assistant will help break it down into tasks."}
        </div>
      ) : connectionState === HubConnectionState.Connecting ? (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
          Connecting to chat service...
        </div>
      ) : (
        <ChatMessageList
          messages={messages}
          userName={userName}
        />
      )}
    </div>
  );
};
