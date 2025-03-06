import { Separator } from '@/components/ui/separator';

const TaskSeparator = ({ color, isDone }) => {
  return (
    <Separator
      orientation="vertical"
      decorative={true}
      className="w-[4px] rounded-md"
      style={{ background: isDone ? '#BFC0C9' : color || '#9698A7' }}
    />
  );
};

export default TaskSeparator;
