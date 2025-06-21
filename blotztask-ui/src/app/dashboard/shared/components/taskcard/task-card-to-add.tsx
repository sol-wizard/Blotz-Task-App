'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { addTaskItem } from '@/services/task-service';
import { mapTaskToAddTask } from '@/app/dashboard/goal-to-task/utils/map-task-to-addtask-dto';
import { TaskDetailDTO } from '@/model/task-detail-dto';

interface TaskCardToAddProps {
  taskToAdd: TaskDetailDTO;
  index: number;
  addedTaskIndices: Set<number>;
  onTaskAdded?: (index: number) => void;
  disabled?: boolean;
}

// This task card is used by AI page
export default function TaskCardToAdd({
  taskToAdd,
  index,
  addedTaskIndices,
  onTaskAdded,
  disabled = false,
}: TaskCardToAddProps) {
  const [adding, setAdding] = useState(false);
  const isAdded = addedTaskIndices.has(index);

  const handleAddTask = async () => {
    if (isAdded) return;
    
    setAdding(true);

    try {
      await addTaskItem(mapTaskToAddTask(taskToAdd));
      
      if (onTaskAdded) {
        onTaskAdded(index);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card
      className={`p-4 shadow-md space-y-2 border-2 rounded-xl transition-all ${
        isAdded ? 'border-green-400 bg-green-50' : 'border-zinc-200'
      }`}
    >
      <h2 className="text-lg font-semibold text-zinc-800">{taskToAdd.title}</h2>
      <p className="text-sm text-zinc-600">
        <strong>Description:</strong> {taskToAdd.description ?? 'None'}
      </p>
      <p className="text-sm text-zinc-600">
        <strong>Due Date:</strong> {taskToAdd.dueDate.toLocaleDateString()}
      </p>
      <p className="text-sm text-zinc-600 flex items-center">
        <span
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: taskToAdd.label.color || 'green' }}
        ></span>
        <span className="ml-2 font-bold">{taskToAdd.label.name || 'Others'}</span>
      </p>

      <Button
        size="sm"
        className={`mt-2 w-fit flex items-center gap-2 rounded-md font-medium transition ${
          isAdded
            ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed opacity-60'
            : 'bg-violet-600 text-white hover:bg-violet-700'
        }`}
        onClick={handleAddTask}
        disabled={disabled || adding || isAdded}
      >
        {isAdded ? '✅ Added' : adding ? 'Adding...' : 'Add Task'}
      </Button>
    </Card>
  );
}