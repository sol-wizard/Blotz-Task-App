import React, { useRef, useState } from 'react';
import AddTaskCard from './add-task-card'
import { PlusIcon } from '@radix-ui/react-icons';
// import useClickOutside from '@/utils/use-multiple-click-away';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AiAssistant from '../../../ai-assistant/component/ai-assistant';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { Cross2Icon } from '@radix-ui/react-icons';

interface AddTaskCardContainerProps {
  onAddTask: (task: RawAddTaskDTO) => void;
}

const AddTaskCardContainer = ({ onAddTask }: AddTaskCardContainerProps) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  // const cardRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const labelPickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  const [useAiAssistant, setUseAiAssistant] = useState(true);

  // useClickOutside([cardRef, datePickerRef, labelPickerRef, timePickerRef], () => {
  //   setIsFormVisible(false);
  // });

  return (
    <div className="flex w-full items-center gap-4">
      <div className="flex w-full items-center gap-2 cursor-pointer">
        {!isFormVisible ? (
          <div className="flex flex-row" onClick={() => setIsFormVisible(true)}>
            <PlusIcon className="ml-2 w-7 h-7 text-gray-400" />
            <span className="ml-3 text-gray-400 font-semibold text-lg">Add a task</span>
          </div>
        ) : (
          <Card className='w-full px-6 pb-4 pt-1'>
          <CardHeader className='flex-row justify-between p-4'>
            <div className="flex flex-row gap-2 items-center">
              <Switch 
                  id="ai-assistant"                   
                  checked={useAiAssistant}
                  onCheckedChange={(checked) => {
                    setUseAiAssistant(checked);
                  }}
              />
              <Label htmlFor="ai-assistant">🤖 AI Assistant</Label>
            </div>
            <div className="flex h-full items-center space-x-2">
              <Cross2Icon
                className="h-4 w-4 cursor-pointer text-black rounded-full transition-colors duration-150 hover:text-red-500 hover:bg-red-100 hover:border hover:border-red-200"
                onClick={() => setIsFormVisible(false)}
                role="button"
                aria-label="Cancel"
              />
            </div>
            </CardHeader>
            <CardContent>
              {useAiAssistant ? (
                  <AiAssistant onAddTask={onAddTask}/>
                ) : (
                  <AddTaskCard
                    onSubmit={(taskDetails) => {
                      onAddTask(taskDetails);
                    }}
                    onCancel={() => setIsFormVisible(false)}
                    datePickerRef={datePickerRef}
                    labelPickerRef={labelPickerRef}
                    timePickerRef={timePickerRef}
                  />
                )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AddTaskCardContainer;
