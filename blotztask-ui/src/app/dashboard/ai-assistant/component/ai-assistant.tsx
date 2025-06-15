import React, { useState } from 'react';
import PromptInputSection from '@/app/dashboard/ai-assistant/component/prompt-input-container';
import AiGeneratedTasksList from '@/app/dashboard/ai-assistant/component/ai-generated-tasks-list';
import { generateAiTask } from '@/services/ai-service';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { TaskDetailDTO } from '@/model/task-detail-dto';

interface AiAssistantProps {
  onAddTask: (task: RawAddTaskDTO) => void;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ onAddTask }) => {
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [tasks, setTasks] = useState<TaskDetailDTO[]>([]);

  const handleGenerateTasksFromPrompt = async (prompt: string) => {
    if (!prompt.trim()) return;

    // Reset the state of ai message and tasks
    setAiMessage('');
    setTasks([]);

    setLoading(true);
    try {
      const aiResponse = await generateAiTask(prompt);
      setAiMessage(aiResponse.message);
      setTasks(aiResponse.tasks);
    } catch (error) {
      console.error('Failed to generate task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-2 flex flex-col gap-4'>
      <PromptInputSection
        loading={loading}
        onGenerate={handleGenerateTasksFromPrompt}
      />
      <AiGeneratedTasksList
        loading={loading}
        aiMessage={aiMessage}
        tasks={tasks}
        onAddTask={onAddTask}
      />
    </div>
  );
};

export default AiAssistant; 