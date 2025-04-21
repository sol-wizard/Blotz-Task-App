import { Pencil } from "lucide-react";
import DeleteTaskDialog from "../container/delete-dialog-content";

export const TaskEditActions = ({ task, isEditing, onEditToggle, onDelete, onUndo }) => {
    if (isEditing || task.isDone) return null;
  
    return (
      <div className="justify-end hidden ml-4 w-32 group-hover:flex">
        <button type="button" className="mx-2.5 p-0.5 hover:bg-[#DEE6FF] rounded-md" onClick={onEditToggle}>
          <Pencil className="text-primary" size={20} />
        </button>
        <DeleteTaskDialog task={task} onDelete={onDelete} handleUndo={() => onUndo(task.id)} />
      </div>
    );
  };
  