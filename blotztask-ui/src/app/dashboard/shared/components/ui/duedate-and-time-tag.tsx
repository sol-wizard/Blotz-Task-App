import { TaskDetailDTO } from '@/model/task-detail-dto';
import { format } from 'node_modules/date-fns/format';
import { TaskCardStatus } from '../taskcard/task-card'
import { cn } from '@/lib/utils';
import { CircleAlertIcon } from 'lucide-react';

const DateAndTimeTag = ({ task, taskStatus }: { task: TaskDetailDTO; taskStatus?: TaskCardStatus }) => {
  const statusVariants = {
    done: 'bg-transparent text-[#BFC0C9]',
    todo: 'bg-[#E5E7EB] text-[#6B7280]',
    overdue: 'bg-transparent text-[#6B7280]',
  };
  const statusClass = statusVariants[taskStatus] || statusVariants.todo;

  return (
    <div className={cn('flex items-center justify-center px-5 text-xs rounded-full', statusClass)}>
      {taskStatus === 'overdue' && (
        <span>
          <CircleAlertIcon color="#fff" fill="#ef4444" />
        </span>
      )}
      <span className="pl-1">{format(new Date(task.endTime), 'MM/dd/yyyy')}</span>

    </div>
  );
};

export default DateAndTimeTag;
