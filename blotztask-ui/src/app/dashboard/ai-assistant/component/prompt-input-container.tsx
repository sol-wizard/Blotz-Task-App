import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import VoiceRecognizer from "../external-services/voice-recognizer";
import { TaskDetailDTO } from "@/model/task-detail-dto";
import TaskCard from "../../shared/components/taskcard/task-card";
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
  onSubmit: (task: RawAddTaskDTO) => void;
}

const PromptInputSection: React.FC<PromptInputSectionProps> = ({
  prompt,
  setPrompt,
  loading,
  onGenerate,
  onSubmit,
}) => {

  const [mockTasks, setMockTasks] = useState<TaskDetailDTO[]>([]);

  const handleGenerate = () => {
    onGenerate();
    setMockTasks(MOCK_TASKS); // Simulate AI response
  };

  const handleTaskUpdate = (updatedTask: Partial<TaskDetailDTO> & { id: number }) => {
    setMockTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    );
  };

  const handleTaskDelete = (taskId: number) => {
    setMockTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

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
      </div>

      <Button onClick={handleGenerate} disabled={loading} className="w-fit mt-2">
        {loading ? "Generating…" : "Generate Task"}
      </Button>

      {mockTasks.length > 0 && (
        <div className="mt-4 space-y-4">
          {mockTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl bg-blue-50 border border-blue-200 p-4"
            >
              <p className="text-sm font-medium text-blue-700 mb-3">
                AI Task Suggestion
              </p>

              {/* White card wrapper */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <TaskCard
                  task={task}
                  status="todo"
                  onSubmit={handleTaskUpdate}
                  onDelete={handleTaskDelete}
                  handleTaskDeleteUndo={(id) => console.log("Undo delete for", id)}
                />
              </div>

              {/* Action buttons outside the white card */}
              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={() => onSubmit(dtoCast(task))}>
                  ✅ Add Task
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}


      </div>
  );
};

export default PromptInputSection;
