//TODO: Is message and chat message same ?
export interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: Date;
    isBot: boolean;
  }