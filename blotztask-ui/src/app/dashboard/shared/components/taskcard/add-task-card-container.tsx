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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import TaskCardToAdd from './task-card-to-add';

const AddTaskCardContainer = ({ onAddTask }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const labelPickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  const [useAIAssistant, setUseAIAssistant] = useState(false);
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
      console.log('Generated task:', task);
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
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="prompt">Prompt to generate Task</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="prompt"
                          placeholder="e.g. Remind me to submit the report by Friday"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-md"
                        />
                      </div>
                      <button 
                        onClick={handlePromptGenerate} 
                        disabled={loading || !prompt.trim()} 
                        className="w-fit mt-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                      >
                        {loading ? "Generating…" : "Generate Task"}
                      </button>
                    </div>

                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <LoadingSpinner variant="blue" className="text-xs" />
                        <span>Generating your task...</span>
                      </div>
                    )}

                    {wrappedExtractedTasks?.message && (
                      <Alert className="bg-blue-50 border-blue-300 text-blue-800 flex items-start gap-2">
                        <Info className="h-4 w-4 mt-1" />
                        <div>
                          <AlertTitle className="font-semibold">AI Assistant 🤖</AlertTitle>
                          <AlertDescription className="text-sm">{wrappedExtractedTasks.message}</AlertDescription>
                        </div>
                      </Alert>
                    )}

                    {wrappedExtractedTasks?.tasks?.length !== 0 &&
                      wrappedExtractedTasks?.tasks
                        .filter((t) => t.isValidTask)
                        .map((extractedTask, index) => (
                          <TaskCardToAdd
                            key={index}
                            taskToAdd={extractedTask}
                            index={index}
                            addedTaskIndices={addedTaskIndices}
                            onTaskAdded={handleTaskAdded}
                          />
                        ))}

                    {!loading && !wrappedExtractedTasks && (
                      <p className="text-zinc-400 text-sm italic">No task generated yet.</p>
                    )}
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
