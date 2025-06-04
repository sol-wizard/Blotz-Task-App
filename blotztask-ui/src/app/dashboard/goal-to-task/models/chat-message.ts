// This model defines the shape of chat messages exchanged via SignalR.
// ⚠️ It must stay in sync with the backend 'ConversationMessage' (C#).
interface ConversationMessage {
  sender: string;
  content: string;
  conversationId: string;
  timestamp: Date; //TODO: Not sure about time data type here
  isBot: boolean;
}

  export type ChatRenderMessage = ConversationMessage & {
    isBotTypingPlaceholder?: boolean;
  };