import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Info } from "lucide-react";
import { TaskDetailDTO } from "@/model/task-detail-dto";
import AITaskCardContainer from "./ai-task-card-container";
import { RawEditTaskDTO } from "@/model/raw-edit-task-dto";
import { RawAddTaskDTO } from "@/model/raw-add-task-dto";
import { mapTaskToAddTask } from "../../goal-to-task/utils/map-task-to-addtask-dto";

interface AiGeneratedTasksListProps {
  loading: boolean;
  aiMessage: string;
  tasks: TaskDetailDTO[];
  setTasks: React.Dispatch<React.SetStateAction<TaskDetailDTO[]>>;
  onAddTask: (task: RawAddTaskDTO) => void;
}

const AiGeneratedTasksList: React.FC<AiGeneratedTasksListProps> = ({
  loading,
  aiMessage,
  tasks,
  setTasks,
  onAddTask,
}) => {

  //TODO: More functionality should be added to this function
  const handleAddTask = (task: TaskDetailDTO) => {
    const taskToAdd = mapTaskToAddTask(task);
    onAddTask(taskToAdd);
  };

  const handleTaskEdit = (updatedTask: RawEditTaskDTO) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    );
  }; 

  const handleTaskDelete = (taskId: number) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
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