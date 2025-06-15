import React, { useState } from 'react';
import PromptInputSection from '@/app/dashboard/ai-assistant/component/prompt-input-container';
import AiGeneratedTasksList from '@/app/dashboard/ai-assistant/component/ai-generated-tasks-list';
import { AIAssistantResponse } from '@/model/ai-assistant-response';
import { generateAiTask } from '@/services/ai-service';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';

interface AiAssistantProps {
  onAddTask: (task: RawAddTaskDTO) => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ onAddTask }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAssistantResponse, setAiAssistantResponse] = useState<AIAssistantResponse>(null);

  const handleGenerateTasksFromPrompt = async () => {
    if (!prompt.trim()) return;
    setAiAssistantResponse(null);
    setLoading(true);
    try {
      const aiResponse = await generateAiTask(prompt);
      setAiAssistantResponse(aiResponse);
    } catch (error) {
      console.error('Failed to generate task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-2 flex flex-col gap-4'>
      <PromptInputSection
        prompt={prompt}
        setPrompt={setPrompt}
        loading={loading}
        onGenerate={handleGenerateTasksFromPrompt}
      />
      <AiGeneratedTasksList
        loading={loading}
        aiAssistantResponse={aiAssistantResponse}
        onAddTask={onAddTask}
      />
    </div>
  );
};

export default AiAssistant; 