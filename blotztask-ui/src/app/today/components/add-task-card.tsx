import React, { useState } from 'react';
import AddTaskForm from './add-task-form';
import { PlusIcon } from '@radix-ui/react-icons';
import TaskSeparator from '../shared/task-separator';

const AddTaskCard = ({ onAddTask }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);

  return (
    <div className="flex">
      <div className="w-6 h-6 mr-6 border border-gray-400 rounded-full border-dashed"></div>
      <div className="flex items-center gap-2 cursor-pointe" onClick={() => setIsFormVisible(true)}>

        <TaskSeparator />
        {!isFormVisible ? (
          <>
            <PlusIcon className="w-6 h-6 text-blue-400" />
            <span className="text-blue-400 font-semibold text-lg">Add a task</span>
          </>
        ) : (
          <AddTaskForm
            onSubmit={(taskTitle: string) => {
              onAddTask(taskTitle);
              setIsFormVisible(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AddTaskCard;
