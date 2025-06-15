import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Info } from "lucide-react";
import { TaskDetailDTO } from "@/model/task-detail-dto";
import AITaskCardContainer from "./ai-task-card-container";
import { RawEditTaskDTO } from "@/model/raw-edit-task-dto";
import { RawAddTaskDTO } from "@/model/raw-add-task-dto";

interface AiGeneratedTasksListProps {
  loading: boolean;
  aiMessage: string;
  tasks: TaskDetailDTO[];
  onAddTask: (task: RawAddTaskDTO) => void;
}

const AiGeneratedTasksList: React.FC<AiGeneratedTasksListProps> = ({
  loading,
  aiMessage,
  tasks,
}) => {

  //TODO: Handle add task to task list
  const handleAddTask = (task: TaskDetailDTO) => {
    console.log('add this ai generated task to task list', task);
    //TODO: Need to map the task to the raw add task dto
    // onAddTask(task);
  };

  //TODO: Handle edit the task that is still in the state
  const handleTaskEdit = (task: RawEditTaskDTO) => {
    console.log('You need to edit this task in the state', task);
  }; 

  //TODO: Handle delete task from the state 
  //TODO: Delete is not abit tricky because have some bug when click outside effect which will close the card
  const handleTaskDelete = (taskId: number) => {
    console.log('You are trying to delete this task from the state', taskId);
  };
  
  return (
    <div className="flex flex-col gap-4">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <LoadingSpinner variant="blue" className="text-xs" />
          <span>Generating your task...</span>
        </div>
      )}
    
      {aiMessage && (
        <Alert className="bg-blue-50 border-blue-300 text-blue-800 flex items-start gap-2">
          <Info className="h-4 w-4 mt-1" />
          <div>
            <AlertTitle className="font-semibold">AI Assistant 🤖</AlertTitle>
            <AlertDescription className="text-sm">{aiMessage}</AlertDescription>
          </div>
        </Alert>
      )}
    
      {tasks?.length !== 0 &&
        tasks
          .map((task, index) => (
            <AITaskCardContainer
              key={index}
              task={task}
              handleCheckboxChange={handleAddTask}
              handleTaskEdit={handleTaskEdit}
              handleTaskDelete={handleTaskDelete}
            />
      ))}
    
      {!loading && tasks.length === 0 && (
        <p className="text-zinc-400 text-sm italic">No task generated yet.</p>
      )}
    </div>
  )
};

export default AiGeneratedTasksList;