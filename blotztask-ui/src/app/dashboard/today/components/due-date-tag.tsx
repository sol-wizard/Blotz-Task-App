import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { format } from 'node_modules/date-fns/format';

const DueDateTag = ({ task }: { task: TaskDetailDTO }) => {
  return (
    <div
      className="flex items-center justify-center w-40 
                 text-xs text-gray-500 rounded-full"
      style={{ background: task.isDone ? undefined : '#E5E7EB' }}
    >
      Due day - {format(new Date(task.dueDate), 'MM/dd/yyyy')}
    </div>
  );
};

export default DueDateTag;
