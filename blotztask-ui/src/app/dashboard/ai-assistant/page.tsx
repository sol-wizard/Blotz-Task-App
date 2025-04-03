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

export default function AiAssistant() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedTask | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // Clear previous result
    setResult(null);
    setLoading(true);

    try {
      const task = await generateAiTask(prompt);
      setResult(task);
    } catch (error) {
      console.error('Failed to generate task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-5 flex flex-col gap-12 mt-8 max-w-3xl">
      {/* Heading */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-zinc-800">AI Task Assistant 🤖</h1>
        <p className="text-zinc-500 text-sm">Describe what you want to do and I’ll turn it into a task.</p>
      </div>

      {/* Prompt Input */}
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

      {/* Result Divider */}
      <Divider text="Generated Task" />

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner variant="blue" className="text-xs" />
          Generating your task...
        </div>
      )}

      {/* Generated Task Card */}
      {!loading && result && (
        <Card className="p-4 shadow-md space-y-2">
          <h2 className="text-lg font-semibold text-zinc-800">{result.title}</h2>
          <p className="text-sm text-zinc-600">
            <strong>Due Date:</strong> {result.due_date ?? 'None'}
          </p>
          <Button size="sm" className="mt-2 w-fit">
            Save Task
          </Button>
        </Card>
      )}

      {!loading && !result && (
        <p className="text-zinc-400 text-sm italic">No task generated yet.</p>
      )}
    </div>
  );
}
