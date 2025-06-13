import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { CheckIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

type TaskPreviewCardProps = {
  task: ExtractedTask;
  onTaskAdded: (task: ExtractedTask) => void;
};

const TaskPreviewCard = ({ task, onTaskAdded }: TaskPreviewCardProps) => {
  const [adding, setAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false); 

  return (
    <>
      <Card
        className={`flex flex-row justify-between w-[80%] mt-4 p-4 shadow-md space-y-2 border-2 rounded-xl`}
      >
        <div className='pr-2 flex flex-col gap-1'>
          <h2 className="text-md font-semibold text-zinc-800">{task.title}</h2>
          <p className="text-xs text-zinc-600">
            <strong>Description:</strong> {task.description ?? 'None'}
          </p>
          <p className="text-xs text-zinc-600">
            <strong>Due Date:</strong> {task.due_date ?? 'None'}
          </p>
          <p className="text-xs text-zinc-600 flex items-center">
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: task.label.color || 'green' }}
            ></span>
            <span className="ml-2 font-bold">{task.label.name || 'Others'}</span>
          </p>
        </div>

        <Button
        size='sm'
          className={`self-center m-2 w-12 h-12 flex items-center gap-2 rounded-md font-medium transition ${
            isAdded
              ? 'bg-green-200 text-gray-500 border border-gray-300 cursor-not-allowed opacity-60'
              : 'bg-blue-100 hover:bg-blue-200'
          }`}
          onClick={() => {
            setAdding(true);
            onTaskAdded(task);
            setTimeout(() => {
              setAdding(false);
              setIsAdded(true);
            }, 500);
          }}
          disabled={adding || isAdded}
        >
          {isAdded ? <CheckIcon stroke='green' /> : adding ? <Loader2Icon/> : <PlusIcon stroke='blue'/>}
        </Button>
      </Card>
    </>
  );
};

export default TaskPreviewCard;