'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Mic } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import TaskCardContainer from '../shared/components/taskcard/task-card-container';
import TaskCard from '../shared/components/taskcard/task-card';
import TaskCardSelection from './components/task-card-selection';

const mockTasks: TaskDetailDTO[] = [
  {
    id: 1,
    title: 'Book flight tickets',
    description: 'Find and book the cheapest flights to Tokyo.',
    isDone: false,
    label: { name: 'Travel', color: '#A78BFA' },
    dueDate: new Date(),
    hasTime: false,
  },
  {
    id: 2,
    title: 'Reserve accommodation',
    description: 'Choose and reserve a hotel in Shinjuku area.',
    isDone: false,
    label: { name: 'Lodging', color: '#F472B6' },
    dueDate: new Date(),
    hasTime: false,
  },
  {
    id: 3,
    title: 'Create itinerary',
    description: 'Plan activities for 6 days including Kyoto and Nara.',
    isDone: false,
    label: { name: 'Planning', color: '#60A5FA' },
    dueDate: new Date(),
    hasTime: false,
  },
];

interface Message {
  sender: 'user' | 'bot';
  text: string;
  tasks?: TaskDetailDTO[];
}

export default function GoalToTaskV2() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: "Hi! I'm your goal planner bot. How can I help you today?" },
  ]);
  const [input, setInput] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<TaskDetailDTO[]>([]);

  const handleCheckBoxChange = (taskId: number) => {
    const task = mockTasks.find((t) => t.id === taskId);
    if (!task) return;

    setSelectedTasks((prev) => {
      const exists = prev.find((t) => t.id === taskId);
      return exists ? prev.filter((t) => t.id !== taskId) : [...prev, task];
    });
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { sender: 'user', text: input, tasks: null };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // mock reply after 1s
    setTimeout(() => {
      const botReply: Message = {
        sender: 'bot',
        text: `Planning your trip to Japan for 6 days in June! Here's what I suggest...`,
        tasks: mockTasks,
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
      <div
        className={`p-4 flex flex-row h-[90vh] w-[600px] 
        ${selectedTasks.length ? 'mr-auto' : 'mx-auto'}`}
      >
        <div className="p-4 flex flex-col max-w-2xl">
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
                    {msg.sender === 'user' && (
                      <div className={`text-sm p-2 rounded-lg w-fit max-w-[80%] bg-[#BAB6FA]`}>
                        {msg.text}
                      </div>
                    )}

                    {msg.sender === 'bot' && (
                      <div className={`text-sm p-2 rounded-lg w-fit max-w-[80%] bg-[#EFF3FF]`}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

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

        {selectedTasks.length !== 0 && (
          <Card className="mr-6 mt-4 w-96">
            <CardHeader>
              <CardTitle>Selected Tasks</CardTitle>
            </CardHeader>
            {selectedTasks.map((task) => (
              <TaskCard task={task}></TaskCard>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
