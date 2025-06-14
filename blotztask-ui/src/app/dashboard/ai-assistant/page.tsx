'use client';

import { useState } from 'react';
import { generateAiTask } from '@/services/ai-service';
import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';
import PromptInputSection from './component/prompt-input-container';

export default function AiAssistant() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [wrappedExtractedTasks, setWrappedExtractedTasks] = useState<ExtractedTasksWrapperDTO | null>(null);
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setWrappedExtractedTasks(null);
    setAddedTaskIndices(new Set());
    setLoading(true);

    try {
      const task = await generateAiTask(prompt);
      setWrappedExtractedTasks(task);
    } catch (error) {
      console.error('Failed to generate task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAdded = (index) => {
    setAddedTaskIndices((prev) => new Set(prev).add(index));
  };

  return (
    <div className="ml-5 flex flex-col gap-6 mt-8 w-3/4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-zinc-800">AI Task Assistant 🤖</h1>
        <p className="text-zinc-500 text-sm">
          Describe what you want to do and I&apos;ll turn it into a task.
        </p>
      </div>

      <PromptInputSection
        prompt={prompt}
        setPrompt={setPrompt}
        loading={loading}
        onGenerate={handleGenerate}
        wrappedExtractedTasks={wrappedExtractedTasks}
        addedTaskIndices={addedTaskIndices}
        handleTaskAdded={handleTaskAdded}
    />
    </div>
  );
}
