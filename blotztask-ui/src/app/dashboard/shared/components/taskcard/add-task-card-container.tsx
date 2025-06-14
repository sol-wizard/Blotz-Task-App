import React, { useRef, useState } from 'react';
import AddTaskCard from './add-task-card'
import { PlusIcon } from '@radix-ui/react-icons';
import useClickOutside from '@/utils/use-multiple-click-away';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { H5 } from '@/components/ui/heading-with-anchor';
import PromptInputSection from '@/app/dashboard/ai-assistant/component/prompt-input-container';
import { generateAiTask } from '@/services/ai-service';
import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';

const AddTaskCardContainer = ({ onAddTask }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const labelPickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  const [useAIAssistant, setUseAIAssistant] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [wrappedExtractedTasks, setWrappedExtractedTasks] = useState<ExtractedTasksWrapperDTO | null>(null);
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());

  const handlePromptGenerate = async () => {
    if (!prompt.trim()) return;

    setWrappedExtractedTasks(null);
    setAddedTaskIndices(new Set());
    setLoading(true);

    try {
      const task = await generateAiTask(prompt);
      setWrappedExtractedTasks(task);
    } catch (error) {
      console.error('Failed to generate task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskAdded = (index) => {
    setAddedTaskIndices((prev) => new Set(prev).add(index));
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
                onCheckedChange={(checked) => {
                  setUseAIAssistant(checked);
                  if (!checked) {
                    setWrappedExtractedTasks(null);
                    setAddedTaskIndices(new Set());
                  }
                }}
              />
              <Label htmlFor="ai-assistant">🤖 Ai Assistant</Label>
            </div>
            </CardHeader>
            <CardContent>
              {useAIAssistant ? (
                  <div className='p-2 flex flex-col gap-4'>
                    <PromptInputSection
                        prompt={prompt}
                        setPrompt={setPrompt}
                        loading={loading}
                        onGenerate={handlePromptGenerate}
                        wrappedExtractedTasks={wrappedExtractedTasks}
                        addedTaskIndices={addedTaskIndices}
                        handleTaskAdded={handleTaskAdded}
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
