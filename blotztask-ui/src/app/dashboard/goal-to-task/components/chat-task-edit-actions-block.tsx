import { Pencil, Trash2 } from 'lucide-react';

export const ChatTaskEditActions = ({ isEditing, isHovered, onEditToggle, onDelete }) => {
  if (isEditing) return null;

  return (
    <div className={`justify-end ml-4 w-10 flex ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
      <button type="button" className="mx-2.5 p-0.5 hover:bg-[#DEE6FF] rounded-md" onClick={onEditToggle}>
        <Pencil className="text-primary" size={20} />
      </button>
      <button className="p-0.5 hover:bg-[#DEE6FF] rounded-md" onClick={onDelete}>
        <Trash2 className="text-primary" size={18} />
      </button>
    </div>
  );
};
