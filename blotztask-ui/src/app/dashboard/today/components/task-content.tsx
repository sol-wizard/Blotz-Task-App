import DueDateTag from './due-date-tag';
import TaskSeparator from '../shared/task-separator';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import SectionSepreator from './section-separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from 'src/components/ui/task-card-input';
// import { LabelSelect } from '../shared/label-select';
import DeleteDialogContent from './delete-dialog-content';
// import { CalendarForm } from '../shared/calendar-form';
import { TaskDetailDTO } from '@/app/dashboard/task-list/models/task-detail-dto';
import { Dialog, DialogTrigger } from 'src/components/ui/dialog';

export default function TaskContent({ task }: { task: TaskDetailDTO }) {
  const [isEditing, setIsEditing] = useState(false);
  const handleEditState = () => setIsEditing(!isEditing);

  return (
    <div className="flex flex-col w-full ">
      <div className="flex flex-row w-full bg-transparent group mb-2">
        <TaskSeparator color={task.label.color} />

        <div className="flex flex-col w-full bg-transparent px-6">
          <div className="flex flex-row justify-between w-full">
            {isEditing ? (
              <Input placeholder={task?.title} className="font-bold"></Input>
            ) : (
              <p className="font-bold">{task?.title}</p>
            )}
            {!isEditing && <DueDateTag task={task} />}
          </div>
          <div className="flex w-full text-base text-gray-500 mt-2">
            <div className="flex flex-col w-full">
              {isEditing ? <Textarea placeholder={task?.description}></Textarea> : <p>{task?.description}</p>}
            </div>

            <div className="flex items-start ml-4 w-32 group-hover:hidden">
              {!isEditing && (
                <>
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: task.label.color || 'gray' }}
                  ></div>
                  <span className="ml-2 font-bold">{task.label?.name || 'No label name'}</span>
                </>
              )}
            </div>

            {!isEditing && (
              <div className="justify-end hidden ml-4 w-32 group-hover:flex">
                <button className="px-4" onClick={handleEditState}>
                  <Pencil className="text-primary" size={20} />
                </button>
                <Dialog>
                  <DialogTrigger asChild>
                    <button>
                      <Trash2 className="text-primary" size={20} />
                    </button>
                  </DialogTrigger>
                  <DeleteDialogContent />
                </Dialog>
              </div>
            )}
          </div>
          {isEditing && (
            <div className="flex flex-row inline-block justify-between mt-4 mb-2">
              <div className="flex flex-row items-center">
                {/* Wait to be done in edit TaskCard React hook form */}
                {/* <CalendarForm task={task} />
              <LabelSelect /> */}
              </div>
              <div className="flex flex-row ">
                <button
                  className="bg-neutral-300 rounded-lg px-3 py-2 text-xs text-gray-700 mx-2 w-20"
                  onClick={handleEditState}
                >
                  Cancel
                </button>
                <button
                  className="bg-primary rounded-lg px-3 py-1 text-xs text-white w-20"
                  onClick={handleEditState}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <SectionSepreator />
    </div>
  );
}
