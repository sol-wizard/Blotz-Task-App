import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { Bot, Mic } from 'lucide-react';
import { useState } from 'react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  tasks?: TaskDetailDTO[];
}

export default function ChatbotViewer({
  input,
  setInput,
  messages,
  handleSend,
  className,
}: {
  input: string;
  setInput: (value: string) => void;
  messages: Message[];
  className?: string;
  handleSend: () => void;
}) {
  return (
    <>
      <div className={cn('p-4 m-4 flex flex-col', className)}>
        <ScrollArea className="flex flex-col gap-3 h-full">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'bot' && (
                <div className="mr-2 mt-1 w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs">
                  <Bot size={18} className="text-indigo-600" />
                </div>
              )}
              {msg.sender === 'user' && (
                <div className={`text-sm p-2 rounded-lg w-fit max-w-[80%] bg-[#BAB6FA]`}>{msg.text}</div>
              )}

              {msg.sender === 'bot' && (
                <div className={`text-sm p-2 rounded-lg w-fit max-w-[80%] bg-[#EFF3FF]`}>{msg.text}</div>
              )}
            </div>
          ))}
        </ScrollArea>

        <div className="flex gap-2 mt-4 border border-[#DEE6FF] rounded-lg">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey) return;
              e.preventDefault();
              handleSend();
            }}
            placeholder="Type your message..."
            className="w-full"
          />
          <Mic className="mt-6 mr-2 text-[#574CF6]" />
        </div>
      </div>
    </>
  );
}
