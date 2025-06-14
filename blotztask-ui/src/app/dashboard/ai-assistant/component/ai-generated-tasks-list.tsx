import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { ExtractedTasksWrapperDTO } from "@/model/extracted-tasks-wrapper-dto";
import { Info } from "lucide-react";
import TaskCardToAdd from "../../shared/components/taskcard/task-card-to-add";

interface AiGeneratedTasksListProps {
  loading: boolean;
  wrappedExtractedTasks: ExtractedTasksWrapperDTO;
  addedTaskIndices: Set<number>;
  handleTaskAdded: (value: number) => void;
}

const AiGeneratedTasksList: React.FC<AiGeneratedTasksListProps> = ({
  loading,
  wrappedExtractedTasks,
  addedTaskIndices,
  handleTaskAdded,
}) => {
  return (
    <div className="flex flex-col gap-4">
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
  )
};

export default AiGeneratedTasksList;