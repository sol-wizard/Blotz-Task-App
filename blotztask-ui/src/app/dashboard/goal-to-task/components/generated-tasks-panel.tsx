import { ExtractedTask } from "@/model/extracted-task-dto";
import React from "react";
import TaskCardToAdd from "../../shared/components/taskcard/task-card-to-add";

type Props = {
  tasks: ExtractedTask[];
  addedTaskIndices: Set<number>;
  onTaskAdded: (index: number) => void;
};

export const GeneratedTasksPanel = ({
  tasks,
  addedTaskIndices,
  onTaskAdded,
}: Props) => {
  return (
    <div className="flex flex-col w-1/2">
      <div className="border-b px-4 py-2">
        <div className="font-medium">Generated Tasks</div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No task generated.</p>
          ) : (
            tasks.map((task, index) => (
              <TaskCardToAdd
                key={index}
                taskToAdd={task}
                index={index}
                addedTaskIndices={addedTaskIndices}
                onTaskAdded={onTaskAdded}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
