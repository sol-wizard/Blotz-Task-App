import React, { useState } from 'react';
import PromptInputSection from '@/app/dashboard/ai-assistant/component/prompt-input-container';
import AiGeneratedTasksList from '@/app/dashboard/ai-assistant/component/ai-generated-tasks-list';
import { AIAssistantResponse } from '@/model/ai-assistant-response';
import { generateAiTask } from '@/services/ai-service';

interface AiAssistantProps {
  // Optionally, expose a callback for when a task is added
  onTaskAdded?: (taskIndex: number) => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ onTaskAdded }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAssistantResponse, setAiAssistantResponse] = useState<AIAssistantResponse>(null);
  //TODO: Redo this add task indices to a more simple way
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());

  const handlePromptGenerate = async () => {
    if (!prompt.trim()) return;
    setAiAssistantResponse(null);
    setAddedTaskIndices(new Set());
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

  const handleTaskAdded = (index: number) => {
    setAddedTaskIndices((prev) => new Set(prev).add(index));
    if (onTaskAdded) onTaskAdded(index);
  };

  return (
    <div className='p-2 flex flex-col gap-4'>
      <PromptInputSection
        prompt={prompt}
        setPrompt={setPrompt}
        loading={loading}
        onGenerate={handlePromptGenerate}
      />
      <AiGeneratedTasksList
        loading={loading}
        aiAssistantResponse={aiAssistantResponse}
        addedTaskIndices={addedTaskIndices}
        handleTaskAdded={handleTaskAdded}
      />
    </div>
  );
};

export default AiAssistant; 