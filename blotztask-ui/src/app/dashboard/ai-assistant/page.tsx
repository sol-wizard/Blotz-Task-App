'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/loading-spinner';
import Divider from '../today/components/divider';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { generateAiTask } from '@/services/aiService';
import { addTaskItem } from '@/services/taskService';
import { mapExtractedTaskToAddTaskDTO } from './util/map-extracted-to-add-task';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function AiAssistant() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedTask, setExtractedTask] = useState<ExtractedTask | null>(null);
  const [adding, setAdding] = useState(false);
  const [addSuccess, setSaveSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setExtractedTask(null);
    setSaveSuccess(false);
    setLoading(true);

    try {
      const task = await generateAiTask(prompt);
      setExtractedTask(task);
    } catch (error) {
      console.error('Failed to generate task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!extractedTask) return;

    setAdding(true);

    try {
      const tasktoAdd = mapExtractedTaskToAddTaskDTO(extractedTask);

      await addTaskItem(tasktoAdd);
      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="ml-5 flex flex-col gap-6 mt-8 w-3/4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-zinc-800">AI Task Assistant 🤖</h1>
        <p className="text-zinc-500 text-sm">Describe what you want to do and I’ll turn it into a task.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt">Prompt to generate Task</Label>
        <Input
          id="prompt"
          placeholder="e.g. Remind me to submit the report by Friday"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Button onClick={handleGenerate} disabled={loading} className="w-fit mt-2">
          Generate Task
        </Button>
      </div>

      <Divider text="Generated Task" />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner variant="blue" className="text-xs" />
          Generating your task...
        </div>
      )}

      {!loading && extractedTask && (
        <>
          <Alert className="bg-blue-50 border-blue-300 text-blue-800">
            <Info className="h-4 w-4" />
            <AlertTitle>AI Assistant 🤖</AlertTitle>
            <AlertDescription>{extractedTask.message}</AlertDescription>
          </Alert>

          {extractedTask.isValidTask && (
            <Card
              className={`p-4 shadow-md space-y-2 border-2 rounded-xl transition-all ${
                addSuccess ? 'border-green-400 bg-green-50' : 'border-zinc-200'
              }`}
            >
              <h2 className="text-lg font-semibold text-zinc-800">{extractedTask.title}</h2>
              <p className="text-sm text-zinc-600">
                <strong>Description:</strong> {extractedTask.description ?? 'None'}
              </p>
              <p className="text-sm text-zinc-600">
                <strong>Due Date:</strong> {extractedTask.due_date ?? 'None'}
              </p>

              <Button
                size="sm"
                className={`mt-2 w-fit flex items-center gap-2 rounded-md font-medium transition ${
                  addSuccess
                    ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed opacity-60'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                }`}
                onClick={handleAddTask}
                disabled={adding || addSuccess}
              >
                {addSuccess ? '✅ Added' : adding ? 'Adding...' : 'Add Task'}
              </Button>
            </Card>
          )}
        </>
      )}

      {!loading && !extractedTask && <p className="text-zinc-400 text-sm italic">No task generated yet.</p>}
    </div>
  );
}
