'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { generateAiTaskFromGoal } from '@/services/ai-service';
import { addTaskItem } from '@/services/task-service';
import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Divider from '../today/components/ui/divider';
import { mapExtractedTaskToAddTaskDTO } from '../ai-assistant/util/map-extracted-to-add-task';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function AiAssistant() {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTasksWrapperDTO | null>(null);
  const [adding, setAdding] = useState(false);
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());

  const handleGoalToTask = async () => {
    if (!goal.trim()) return;

    setExtractedTasks(null);
    setAddedTaskIndices(new Set());
    setLoading(true);

    try {
      const payload = { goal, durationInDays: Number(duration) };
      const task = await generateAiTaskFromGoal(payload);
      setExtractedTasks(task);
    } catch (error) {
      console.error('Failed to generate goal-to-task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (extractedTask, index) => {
    if (!extractedTasks) return;

    setAdding(true);

    try {
      const tasktoAdd = mapExtractedTaskToAddTaskDTO(extractedTask);

      await addTaskItem(tasktoAdd);
      setAddedTaskIndices((prev) => new Set(prev).add(index));
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setAdding(false);
    }
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

      {extractedTasks?.message && (
        <Alert className="bg-blue-50 border-blue-300 text-blue-800 flex items-start gap-2">
          <Info className="h-4 w-4 mt-1" />
          <div>
            <AlertTitle className="font-semibold">AI Assistant 🤖</AlertTitle>
            <AlertDescription className="text-sm">{extractedTasks.message}</AlertDescription>
          </div>
        </Alert>
      )}

      {extractedTasks?.tasks?.length !== 0 &&
        extractedTasks?.tasks
          .filter((t) => t.isValidTask)
          .map((extractedTask, index) => (
            <Card
              key={index}
              className={`p-4 shadow-md space-y-2 border-2 rounded-xl transition-all ${
                addedTaskIndices.has(index) ? 'border-green-400 bg-green-50' : 'border-zinc-200'
              }`}
            >
              <h2 className="text-lg font-semibold text-zinc-800">{extractedTask.title}</h2>
              <p className="text-sm text-zinc-600">
                <strong>Description:</strong> {extractedTask.description ?? 'None'}
              </p>
              <p className="text-sm text-zinc-600">
                <strong>Due Date:</strong> {extractedTask.due_date ?? 'None'}
              </p>
              <p className="text-sm text-zinc-600 flex items-center">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: extractedTask.label.color || 'green' }}
                ></span>
                <span className="ml-2 font-bold">{extractedTask.label.name || 'Others'}</span>
              </p>

              <Button
                size="sm"
                className={`mt-2 w-fit flex items-center gap-2 rounded-md font-medium transition ${
                  addedTaskIndices.has(index)
                    ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed opacity-60'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                }`}
                onClick={() => handleAddTask(extractedTask, index)}
                disabled={adding || addedTaskIndices.has(index)}
              >
                {addedTaskIndices.has(index) ? '✅ Added' : adding ? 'Adding...' : 'Add Task'}
              </Button>
            </Card>
          ))}

      {!loading && !extractedTasks && <p className="text-zinc-400 text-sm italic">No task generated yet.</p>}
    </div>
  );
}
