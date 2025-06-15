import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { AIAssistantResponse } from "@/model/extracted-tasks-wrapper-dto";
import { Info } from "lucide-react";
// import TaskCardContainer from "../../shared/components/taskcard/task-card-container";

interface AiGeneratedTasksListProps {
  loading: boolean;
  aiAssistantResponse: AIAssistantResponse;
  addedTaskIndices: Set<number>;
  handleTaskAdded: (value: number) => void;
}

const AiGeneratedTasksList: React.FC<AiGeneratedTasksListProps> = ({
  loading,
  aiAssistantResponse,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner variant="blue" className="text-xs" />
          <span>Generating your task...</span>
        </div>
      )}
    
      {aiAssistantResponse?.message && (
        <Alert className="bg-blue-50 border-blue-300 text-blue-800 flex items-start gap-2">
          <Info className="h-4 w-4 mt-1" />
          <div>
            <AlertTitle className="font-semibold">AI Assistant 🤖</AlertTitle>
            <AlertDescription className="text-sm">{aiAssistantResponse.message}</AlertDescription>
          </div>
        </Alert>
      )}
    
      {aiAssistantResponse?.tasks?.length !== 0 &&
        aiAssistantResponse?.tasks
          .map((task, index) => (
            <p key={index}>{task.title}</p>
            // <TaskCardContainer
            //   key={index}
            //   task={task}
            //   taskStatus="overdue"
            //   handleCheckboxChange={handleOverdueCheckboxChange}
            //   handleTaskEdit={handleTaskEdit}
            //   handleTaskDelete={handleTaskDelete}
            //   handleTaskDeleteUndo={handleTaskDeleteUndo}
            // />
      ))}
    
      {!loading && !aiAssistantResponse && (
        <p className="text-zinc-400 text-sm italic">No task generated yet.</p>
      )}
    </div>
  )
};

export default AiGeneratedTasksList;