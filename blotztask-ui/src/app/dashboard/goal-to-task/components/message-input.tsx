import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";

interface MessageInputProps {
  userMessageInput: string;
  setUserMessageInput: (value: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  isConnecting: boolean;
  isConversationComplete: boolean;
}

//TODO: Consider refactor this to use react-hook-form
export default function MessageInput({
  userMessageInput: newMessage,
  setUserMessageInput: setNewMessage,
  handleSendMessage,
  isConnecting,
  isConversationComplete,
}: MessageInputProps) {
  return (
    <div className="p-2">
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isConnecting || isConversationComplete}
          placeholder={isConversationComplete ? 'Conversation completed' : 'Type your message...'}
          className="flex-1 border rounded p-2 disabled:bg-gray-100"
        />
        <Button
          type="submit"
          disabled={isConnecting || !newMessage.trim() || isConversationComplete}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
        >
          Send
        </Button>
      </form>
    </div>
  );
} 