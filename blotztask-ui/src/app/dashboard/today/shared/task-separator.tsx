import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const TaskSeparator = ({
  color,
  isDone,
  className,
}: {
  color?: string;
  isDone?: boolean;
  className?: string;
}) => {
  return (
    <Separator
      orientation="vertical"
      decorative={true}
      className={cn('w-[4px] rounded-md', className)}
      style={{ background: isDone ? '#BFC0C9' : color || '#9698A7' }}
    />
  );
};

export default TaskSeparator;
