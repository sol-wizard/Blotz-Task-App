import { toast } from 'sonner';
import { TaskDetailDTO } from '../../task-list/models/task-detail-dto';

const showTaskDeletedToast = ({
  handleUndo,
  task,
}: {
  handleUndo: (task: TaskDetailDTO) => void;
  task: TaskDetailDTO;
}) => {
  setTimeout(() => {
    toast('Task Deleted', {
      classNames: {
        toast: 'flex justify-between items-center bg-blue-100 w-64',
        title: 'text-gray-500',
      },
      action: (
        <button
          className="text-blue-500"
          onClick={() => {
            handleUndo(task);
            toast.dismiss();
          }}
        >
          Undo
        </button>
      ),
      position: 'bottom-left',
      duration: 4000,
    });
  }, 100);
};

export default showTaskDeletedToast;
