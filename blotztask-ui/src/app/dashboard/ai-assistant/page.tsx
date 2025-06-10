'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { generateAiTask } from '@/services/ai-service';
import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Divider from '../today/components/ui/divider';
import PromptInputSection from './component/prompt-input-container';
import TaskCardToAdd from '../shared/components/taskcard/task-card-to-add';
import { useScheduleTaskActions } from '../../store/schedule-task-store';

export default function AiAssistant() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [wrappedExtractedTasks, setWrappedExtractedTasks] = useState<ExtractedTasksWrapperDTO | null>(null);
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());

  const { handleAddTask } = useScheduleTaskActions();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setWrappedExtractedTasks(null);
    setAddedTaskIndices(new Set());
    setLoading(true);

    try {
      const task = await generateAiTask(prompt);
      console.log('Generated task:', task);
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
        onSubmit={(taskDetails) => handleAddTask(taskDetails)}
      />

      <Divider text="Generated Task" />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner variant="blue" className="text-xs" />
          Generating your task...
        </div>
      )}

      {wrappedExtractedTasks?.message && (
        <Alert className="bg-blue-50 border-blue-300 text-blue-800 flex items-start gap-2">
          <Info className="h-4 w-4 mt-1" />
          <div>
            <AlertTitle className="font-semibold">AI Assistant 🤖</AlertTitle>
            <AlertDescription className="text-sm">{wrappedExtractedTasks.message}</AlertDescription>
          </div>
        </Alert>
      )}

      {wrappedExtractedTasks?.tasks?.length !== 0 &&
        wrappedExtractedTasks?.tasks
          .filter((t) => t.isValidTask)
          .map((extractedTask, index) => (
            <TaskCardToAdd
              key={index}
              taskToAdd={extractedTask}
              index={index}
              addedTaskIndices={addedTaskIndices}
              onTaskAdded={handleTaskAdded}
            />
          ))}

      {!loading && !wrappedExtractedTasks && (
        <p className="text-zinc-400 text-sm italic">No task generated yet.</p>
      )}
    </div>
  );
}
