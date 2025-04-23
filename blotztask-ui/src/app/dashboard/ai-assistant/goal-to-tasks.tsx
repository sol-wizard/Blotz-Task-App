'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generateTasksFromGoal } from '@/services/ai-service';

export default function GoalToTasksDemo() {
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState(7);
  const [resultJson, setResultJson] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!goal || duration <= 0) return;

    setResultJson('');
    setLoading(true);

    try {
      const data = await generateTasksFromGoal(goal, duration);
      setResultJson(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error);
      setResultJson('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 space-y-4 border p-6 rounded-xl shadow-sm w-full max-w-2xl">
      <h2 className="text-xl font-bold">🎯 Try Goal-to-Tasks AI Assistant</h2>

      <div className="space-y-2">
        <Label htmlFor="goal">Your Goal</Label>
        <Input
          id="goal"
          placeholder="e.g. Prepare for distributed systems exam"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration (days)</Label>
        <Input
          id="duration"
          type="number"
          value={duration}
          min={1}
          onChange={(e) => setDuration(parseInt(e.target.value, 10))}
        />
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Tasks'}
      </Button>

      <div className="space-y-2">
        <Label>Response JSON</Label>
        <Textarea rows={12} value={resultJson} readOnly className="font-mono text-xs bg-zinc-100" />
      </div>
    </div>
  );
}
