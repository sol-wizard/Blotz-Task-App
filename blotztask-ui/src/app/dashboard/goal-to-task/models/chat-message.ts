export interface ConversationMessage {
    sender: string;
    content: string;
    conversationId: string;
    timestamp: Date; //TODO: Not sure about time data type here
    isBot: boolean;
  }
  