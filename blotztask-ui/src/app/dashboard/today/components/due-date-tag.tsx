import { cn } from '@/lib/utils';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { CircleAlertIcon } from 'lucide-react';
import { format } from 'node_modules/date-fns/format';

const DueDateTag = ({ task, isOverdue }: { task: TaskDetailDTO; isOverdue: boolean }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center w-40 text-xs rounded-full',
        task.isDone
          ? 'bg-transparent text-[#BFC0C9]'
          : isOverdue
            ? 'bg-transparent text-[#6B7280]'
            : 'bg-[#E5E7EB] text-[#6B7280]'
      )}
    >
      {isOverdue && (
        <span>
          <CircleAlertIcon color="#fff" fill="#ef4444" />
        </span>
      )}
      <span className="pl-1">Due day - {format(new Date(task.dueDate), 'MM/dd/yyyy')}</span>
    </div>
  );
};

export default DueDateTag;
