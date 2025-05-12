import { TaskDetailDTO } from '@/model/task-detail-dto';
import TaskSeparator from '../../shared/components/ui/task-separator';
import { TaskCardStatus } from '../../shared/components/taskcard/task-card';

export default function AiTaskCard({
  task,
  status = 'todo',
}: {
  task: TaskDetailDTO;
  status?: TaskCardStatus;
}) {
  return (
    <div className="flex flex-row">
      <TaskSeparator color={task.label.color} taskStatus={status} className="mx-3" />
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold">{task.title}</h3>
        <p className="text-sm text-gray-500">{task.description}</p>
      </div>
    </div>
  );
}
