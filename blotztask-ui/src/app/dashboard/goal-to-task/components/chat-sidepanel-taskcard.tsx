import { Card } from '@/components/ui/card';
import { CalendarDaysIcon } from 'lucide-react';
import TaskSeparator from '../../shared/components/ui/task-separator';
import { TaskDetailDTO } from '@/model/task-detail-dto';

type ChatSidePanelTaskcardProps = {
  task: TaskDetailDTO;
  // handleRemoveTask: (taskId: string) => void;
};

const ChatSidePanelTaskcard = ({ task }: ChatSidePanelTaskcardProps) => {
  // const [isEditing, setIsEditing] = useState(false);
  // const [isHovered, setIsHovered] = useState(false);
  // const handleEditState = () => setIsEditing(!isEditing);

  return (
    <>
      <Card
        className="p-4 shadow-md space-y-2 border-2 rounded-xl w-[100%]"
        // onMouseEnter={() => setIsHovered(true)}
        // onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-row gap-3">
        <TaskSeparator color={task.label.color} taskStatus={'todo'} />

          <div className="pr-2 flex flex-col gap-1 flex-1">
            <h2 className="text-sm font-semibold text-zinc-800">{task.title}</h2>
            <p className="text-xs text-zinc-600">{task.description ?? 'None'}</p>
            {/* TODO: Add due time */}
            <div className="text-xs text-zinc-600 flex flex-row justify-between items-center">
              <span className="flex flex-row justify-start gap-1">
                <CalendarDaysIcon size={14} stroke="#52525b" />
                {task.dueDate.toLocaleDateString()}
              </span>
              {/* <ChatTaskEditActions
                isEditing={isEditing}
                isHovered={isHovered}
                onEditToggle={handleEditState}
                onDelete={() => handleRemoveTask(task.id)}
              /> */}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};

export default ChatSidePanelTaskcard;
