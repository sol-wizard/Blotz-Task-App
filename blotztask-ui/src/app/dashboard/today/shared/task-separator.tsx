import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { TaskCardStatus } from '../components/container/task-card';

const TaskSeparator = ({
  color,
  taskStatus,
  className,
}: {
  color?: string;
  taskStatus?: TaskCardStatus;
  className?: string;
}) => {
  
  const statusColorMap: Record<TaskCardStatus, string> = {
    done: '#BFC0C9',
    todo: color || '#9698A7',
  };

  const separatorColor = statusColorMap[taskStatus] ?? color ?? '#9698A7';

  return (
    <Separator
      orientation="vertical"
      decorative={true}
      className={cn('w-[4px] rounded-md', className)}
      style={{ background: separatorColor }}
    />
  );
};

export default TaskSeparator;
