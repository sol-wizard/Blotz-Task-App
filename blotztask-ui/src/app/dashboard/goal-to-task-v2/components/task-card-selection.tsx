import { TaskDetailDTO } from '@/model/task-detail-dto';
import { TaskCardStatus } from '../../shared/components/taskcard/task-card';
import AiTaskCard from './ai-task-card';
import { Checkbox } from '@radix-ui/react-checkbox';

export default function TaskCardSelection({
  task,
  status = 'todo',
  handleCheckBoxChange,
}: {
  task: TaskDetailDTO;
  status?: TaskCardStatus;
  handleCheckBoxChange: (taskId: number) => void;
}) {
  return (
    <div>
      <div className="flex flex-row items-center">
        <Checkbox
          onCheckedChange={() => handleCheckBoxChange(task.id)}
          className="h-3 w-3 mr-2 rounded-full border border-black"
        />
        <AiTaskCard task={task} status={status} />
      </div>
    </div>
  );
}
