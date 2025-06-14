import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import VoiceRecognizer from "../external-services/voice-recognizer";
import { TaskDetailDTO } from "@/model/task-detail-dto";
import TaskCard from "../../shared/components/taskcard/task-card";
<<<<<<< HEAD
import { ExtractedTasksWrapperDTO } from '@/model/extracted-tasks-wrapper-dto';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import TaskCardToAdd from "../../shared/components/taskcard/task-card-to-add";
=======
import { RawAddTaskDTO } from "@/model/raw-add-task-dto";

const MOCK_TASKS: TaskDetailDTO[] = [
  {
    id: 1,
    title: "Review project presentation slides",
    description: "Go through the slides for tomorrow's client meeting and make final adjustments.",
    dueDate: new Date(), 
    isDone: false,
    hasTime: false,
    label: {
      labelId: 6,
      name: "Work",
      color: "#7C3AED",
    },
  },
  {
    id: 2,
    title: "Study for final exam",
    description: "Prepare for the upcoming final exam. Focus on chapters 5-8.",
    dueDate: new Date(),
    isDone: false,
    hasTime: false,
    label: {
      labelId: 8,
      name: "Academic",
      color: "#F87171",
    },
  },
];
>>>>>>> 7a51b471b2051a18c78cb4eb66017f361e5f2657

const dtoCast = (task: TaskDetailDTO) => {
    const taskContent: RawAddTaskDTO = {
      title: task.title,
      description: task.description,
      labelId: task.label.labelId,
      date: task.dueDate,
      time: undefined,
    };
    return taskContent;
  };

interface PromptInputSectionProps {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  onGenerate: () => void;
<<<<<<< HEAD
  wrappedExtractedTasks: ExtractedTasksWrapperDTO;
  addedTaskIndices: Set<number>;
  handleTaskAdded: (value: number) => void;
=======
  onSubmit: (task: RawAddTaskDTO) => void;
>>>>>>> 7a51b471b2051a18c78cb4eb66017f361e5f2657
}

const PromptInputSection: React.FC<PromptInputSectionProps> = ({
  prompt,
  setPrompt,
  loading,
  onGenerate,
<<<<<<< HEAD
  wrappedExtractedTasks,
  addedTaskIndices,
  handleTaskAdded, 
=======
  onSubmit,
>>>>>>> 7a51b471b2051a18c78cb4eb66017f361e5f2657
}) => {

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="prompt">Prompt to generate Task</Label>
      <div className="flex gap-2 items-center">
        <Input
          id="prompt"
          placeholder="e.g. Remind me to submit the report by Friday"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1"
        />
        <VoiceRecognizer
          onResult={(spokenText) => {
            setPrompt(spokenText);
          }}
        />
        <button 
          onClick={onGenerate} 
          disabled={loading || !prompt.trim()} 
          className="w-fit mt-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Generating…" : "Generate Task"}
        </button>
      </div>

      {/* <Button onClick={handleGenerate} disabled={loading} className="w-fit mt-2">
        {loading ? "Generating…" : "Generate Task"}
      </Button> */}

<<<<<<< HEAD
      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner variant="blue" className="text-xs" />
          <span>Generating your task...</span>
=======
      {mockTasks.length > 0 && (
        <div className="mt-4 space-y-4">
          {mockTasks.map((task) => (
            <div className="flex flex-row gap-2 w-full" key={task.id}>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => onSubmit(dtoCast(task))}>
                  ✅ Add Task
                </Button>
              </div>
              {/* White card wrapper */}
              <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-blue-200 w-full">
                
                <TaskCard
                  task={task}
                  status="todo"
                  onSubmit={handleTaskUpdate}
                  onDelete={handleTaskDelete}
                  handleTaskDeleteUndo={(id) => console.log("Undo delete for", id)}
                />
              </div>
            </div>
          ))}
>>>>>>> 7a51b471b2051a18c78cb4eb66017f361e5f2657
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
  );
};

export default PromptInputSection;
