'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Mic } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import VoiceRecognizer from '../ai-assistant/external-services/voice-recognizer';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

export default function GoalToTaskV2() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: "Hi! I'm your goal planner bot. How can I help you today?" },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // mock reply after 1s
    setTimeout(() => {
      const botReply: Message = {
        sender: 'bot',
        text: `Planning your trip to Japan for 6 days in June! Here's what I suggest...`,
      };
      setMessages((prev) => [...prev, botReply]);
    }, 1000);
  };

  return (
    <div>
      <div className="flex flex-row">
        <Bot size={30} className="text-indigo-600" />
        <h1 className="text-2xl font-bold text-indigo-600 ml-4">Goal Planner</h1>
      </div>
      <div className="max-w-xl mx-auto p-4 flex flex-col h-[90vh]">
        <div className="flex-1 p-4">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'bot' && (
                    <div className="mr-2 mt-1 w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-xs">
                      <Bot size={18} className="text-indigo-600" />
                    </div>
                  )}

                  <div
                    className={`text-sm p-2 rounded-lg w-fit max-w-[80%]
        ${msg.sender === 'user' ? 'bg-[#BAB6FA]' : 'bg-[#EFF3FF]'}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex gap-2 mt-4 border border-[#DEE6FF] rounded-lg w-full">
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
    </div>
  );
}
