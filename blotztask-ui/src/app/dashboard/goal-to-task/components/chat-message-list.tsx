import { useEffect, useRef } from "react";
import { ConversationMessage } from "../models/chat-message";

type Props = {
  messages: ConversationMessage[];
  userName: string;
  isBotTyping: boolean;
};

export const ChatMessageList = ({ messages, userName, isBotTyping }: Props) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="space-y-4">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-3 ${
              msg.isBot ? "bg-gray-100" : "bg-blue-100"
            }`}
          >
            <div className="text-xs mb-1 flex justify-between">
              <span>{msg.isBot ? "Assistant" : userName}</span>
              <span className="text-gray-500 ml-4">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
          </div>
        </div>
      ))}

      {isBotTyping && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-lg p-3 max-w-[80%] text-sm italic text-gray-500 animate-pulse">
            Assistant is typing...
          </div>
        </div>
      )}
  
      <div ref={messagesEndRef} />
    </div>
  );
};
