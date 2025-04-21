export const TaskCardLabelBlock = ({ task, isEditing }) => {
    if (isEditing || task.isDone) return null;

    return (
        <div className="flex items-start ml-4 w-32 group-hover:hidden">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: task.label.color || 'gray' }} />
            <span className="ml-2 font-bold">{task.label?.name || 'No label name'}</span>
        </div>
    );
};