import { TaskDetailDTO } from '@/model/task-detail-dto';
import AiTaskCard from './ai-task-card';
import { Checkbox } from '@radix-ui/react-checkbox';

export default function TaskCardSelection({
  task,
  handleCheckBoxChange,
}: {
  task: TaskDetailDTO;
  handleCheckBoxChange: (taskId: number) => void;
}) {
  return (
    <div className="flex flex-row bg-[#F3F3F3] rounded-lg p-2 gap-2 mb-2 mx-2">
      <Checkbox
        onCheckedChange={() => handleCheckBoxChange(task.id)}
        className="h-4 w-4 ml-2 rounded-full border border-black"
      />
      <AiTaskCard task={task} />
    </div>
  );
}
