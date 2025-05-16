'use client';
import { useState } from 'react';
import { Bot } from 'lucide-react';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import ChatbotViewer from './viewer/chatbot-viewer';
import SelectedTaskViewer from './viewer/selected-task-viewer';

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
      setSelectedTasks(mockTasks);
    }, 1000);
  };

  const handleCheckBoxChange = (taskId: number) => {
    console.log('Add task successfully:', taskId);
  };

  return (
    <div>
      <div className="flex flex-row">
        <Bot size={30} className="text-indigo-600" />
        <h1 className="text-2xl font-bold text-indigo-600 ml-4">Goal Planner</h1>
      </div>
      <div className="flex flex-row w-full h-[90vh]">
        <ChatbotViewer
          input={input}
          setInput={setInput}
          messages={messages}
          handleSend={handleSend}
          className={`${selectedTasks.length === 0 ? 'mx-auto' : 'flex-[3]'}`}
        />

        <SelectedTaskViewer selectedTasks={selectedTasks} handleCheckBoxChange={handleCheckBoxChange} />
      </div>
    </div>
  );
}
