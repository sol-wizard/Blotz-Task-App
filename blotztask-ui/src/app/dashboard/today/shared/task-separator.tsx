import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const TaskSeparator = ({
  color,
  isDone,
  className,
  isEditing = false
}: {
  color?: string;
  isDone?: boolean;
  className?: string;
  isEditing?: boolean;
}) => {

  const separatorColor = !isEditing && isDone ? '#BFC0C9' : color || '#9698A7';

  return (
    <Separator
      orientation="vertical"
      decorative={true}
      className={cn('w-[4px] rounded-md', className)}
      style={{ backgroundColor: separatorColor }}
    />
  );
};

export default TaskSeparator;
