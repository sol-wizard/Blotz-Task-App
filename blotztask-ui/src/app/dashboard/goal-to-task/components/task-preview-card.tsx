import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { CalendarDaysIcon, CheckIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

type TaskPreviewCardProps = {
  task: ExtractedTask;
  onTaskAdded: (task: ExtractedTask) => void;
};

const TaskPreviewCard = ({ task, onTaskAdded }: TaskPreviewCardProps) => {
  const [adding, setAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddTask = async () => {
      if (isAdded) return;
      
      setAdding(true);
  
      try {
        onTaskAdded(task)
      } catch (error) {
        console.error('Failed to add task:', error);
      } finally {
        setAdding(false);
        setIsAdded(true);
      }
    };

  return (
    <>
      <Card
        className={`flex flex-row justify-between w-[80%] mt-4 p-4 shadow-md space-y-2 border-2 rounded-xl`}
      >
        <div className='flex flex-row gap-3'>
        <div className="h-auto w-1 rounded-sm" style={{ backgroundColor: task.label.color || 'green' }}></div>
        <div className="pr-2 flex flex-col gap-1">
          <h2 className="text-md font-semibold text-zinc-800">{task.title}</h2>
          <p className="text-xs text-zinc-600">{task.description ?? 'None'}</p>
        {/* TODO: Add due time */}
          <span className="text-xs text-zinc-600 flex flex-row justify-start gap-1">
            <CalendarDaysIcon size={14} stroke="#52525b" />
            {task.due_date ?? 'None'}
          </span>
        </div>
        </div>

        <Button
          size="sm"
          className={`self-center m-2 w-12 h-12 flex items-center gap-2 rounded-md font-medium transition ${
            isAdded
              ? 'bg-green-200 text-gray-500 border border-gray-300 cursor-not-allowed opacity-60'
              : 'bg-blue-100 hover:bg-blue-200'
          }`}
          onClick={handleAddTask}
          disabled={adding || isAdded}
        >
          {isAdded ? <CheckIcon stroke="green" /> : adding ? <Loader2Icon /> : <PlusIcon stroke="blue" />}
        </Button>
      </Card>
    </>
  );
};

export default TaskPreviewCard;
