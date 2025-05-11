import React, { useRef, useState } from 'react';
import AddTaskCard from './add-task-card'
import { PlusIcon } from '@radix-ui/react-icons';
import useClickOutside from '@/utils/use-multiple-click-away';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { H5 } from '@/components/ui/heading-with-anchor';
import PromptInputSection from '@/app/dashboard/ai-assistant/component/prompt-input-container';

const AddTaskCardContainer = ({ onAddTask }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const labelPickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  const [useAIAssistant, setUseAIAssistant] = useState(false);

  //TODO: Move prompt state to somewhere else later
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  //TODO: This is temporary , will be move to the parent component and replace the inner logic with real implementation
  const handlePromptGenerate = () => {
    setLoading(true)
    setTimeout(()=>{
      console.log("generating task")
    }, 1000)
    setLoading(false)
  };

  useClickOutside([cardRef, datePickerRef, labelPickerRef, timePickerRef], () => {
    setIsFormVisible(false);
  });

  return (
    <div className="flex w-full items-center gap-4" ref={cardRef}>
      <div className="flex w-full items-center gap-2 cursor-pointer">
        {!isFormVisible ? (
          <div className="flex flex-row" onClick={() => setIsFormVisible(true)}>
            <PlusIcon className="ml-2 w-7 h-7 text-gray-400" />
            <span className="ml-3 text-gray-400 font-semibold text-lg">Add a task</span>
          </div>
        ) : (
          <Card className='w-full px-6 pb-4 pt-1'>
          <CardHeader className='flex-row justify-between p-4'>
            <H5>Add New Task</H5>
            <div className="flex items-center space-x-2">
              <Switch 
                id="ai-assistant"                   
                checked={useAIAssistant}
                onCheckedChange={setUseAIAssistant}
              />
              <Label htmlFor="ai-assistant">🤖 Ai Assistant</Label>
            </div>
            </CardHeader>
            <CardContent>
              {useAIAssistant ? (
                  <div className='p-2'>
                    <PromptInputSection
                      prompt={prompt}
                      setPrompt={setPrompt}
                      loading={loading}
                      onGenerate={handlePromptGenerate}
                    />
                  </div>
                ) : (
                  <AddTaskCard
                    onSubmit={(taskDetails) => {
                      onAddTask(taskDetails);
                      setIsFormVisible(false);
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
