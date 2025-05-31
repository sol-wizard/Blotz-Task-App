'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { generateAiTaskFromGoal } from '@/services/ai-service';
import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Divider from '../today/components/ui/divider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import TaskCardToAdd from '../shared/components/taskcard/task-card-to-add';

export default function AiAssistant() {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [wrappedExtractedTasks, setWrappedExtractedTasks] = useState<ExtractedTasksWrapperDTO | null>(null);
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());

  const handleGoalToTask = async () => {
    if (!goal.trim()) return;

    setWrappedExtractedTasks(null);
    setAddedTaskIndices(new Set());
    setLoading(true);

    try {
      const payload = { goal, durationInDays: Number(duration) };
      const task = await generateAiTaskFromGoal(payload);
      setWrappedExtractedTasks(task);
    } catch (error) {
      console.error('Failed to generate goal-to-task:', error);
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
        <h1 className="text-3xl font-bold text-zinc-800">Goal to Task 🏃‍♂️</h1>
        <p className="text-zinc-500 text-sm">
          Describe what you want to do and I&apos;ll turn it into a task.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal">Goal to generate Tasks</Label>
        <Input
          id="goal"
          placeholder="e.g. I want to travel to Japan in June"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <Label htmlFor="duration" className="mt-2">
          Duration (in days)
        </Label>

        <Tooltip>
          <TooltipTrigger asChild>
            <Input
              id="duration"
              placeholder="16"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-1/4"
            />
          </TooltipTrigger>
          <TooltipContent className="bg-white" side="right" sideOffset={5}>
            <p className="text-sm text-muted-foreground cursor-help">
              Please specify how many days you want to spend to complete this goal.
            </p>
          </TooltipContent>
        </Tooltip>

        <Button onClick={handleGoalToTask} disabled={loading} className="w-fit mt-2">
          Goal to Task
        </Button>
      </div>

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
