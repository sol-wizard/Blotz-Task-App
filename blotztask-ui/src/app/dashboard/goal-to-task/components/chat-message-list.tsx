import { Message } from "../models/message";

type ChatMessageListProps = {
    messages: Message[];
    userName: string;
    messagesEndRef: React.RefObject<HTMLDivElement>;
  };
  
export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, userName, messagesEndRef }) => {
    return (
        <div className="space-y-4">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                <div
                    className={`max-w-[80%] rounded-lg p-3 ${msg.isBot ? 'bg-gray-100' : 'bg-blue-100'}`}
                >
                    <div className="text-xs mb-1 flex justify-between">
                    <span>{msg.isBot ? 'Assistant' : userName}</span>
                    <span className="text-gray-500 ml-4">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    </div>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
                </div>
            ))}
        <div ref={messagesEndRef} />
        </div>
    );
};
  
