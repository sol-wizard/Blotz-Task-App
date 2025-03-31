import React, { useState, useRef } from 'react';
import AddTaskContainer from './add-task-container';
import { PlusIcon } from '@radix-ui/react-icons';
import useClickOutside from '@/utils/use-multiple-click-away';

const AddTaskCard = ({ onAddTask }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const labelPickerRef = useRef<HTMLDivElement>(null);

  useClickOutside([cardRef, datePickerRef, labelPickerRef], () => {
    setIsFormVisible(false);
  });

  return (
    <div className="flex w-full items-center gap-4" ref={cardRef}>
      <div className="w-6 h-6 border-2 border-gray-400 rounded-full border-dashed"></div>
      <div className="ml-5 w-[0.2rem] self-stretch min-h-10 bg-gray-400 rounded"></div>
      <div className="flex w-full items-center gap-2 cursor-pointer">
        {!isFormVisible ? (
          <div className="flex flex-row" onClick={() => setIsFormVisible(true)}>
            <PlusIcon className="ml-2 w-7 h-7 text-gray-400" />
            <span className="ml-3 text-gray-400 font-semibold text-lg">Add a task</span>
          </div>
        ) : (
          <AddTaskContainer
            onSubmit={(taskDetails) => {
              onAddTask(taskDetails);
              setIsFormVisible(false);
            }}
            datePickerRef={datePickerRef}
            labelPickerRef={labelPickerRef}
            onCancel={() => setIsFormVisible(false)}
          />
        )}
      </div>
    </div>
  );
};

export default AddTaskCard;
