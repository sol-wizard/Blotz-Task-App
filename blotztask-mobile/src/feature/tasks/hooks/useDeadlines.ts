import { useQuery } from "@tanstack/react-query";
import { getAllTasks } from "@/shared/services/task-service";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { taskKeys } from "@/shared/constants/query-key-factory";

export interface DeadlineTask extends TaskDetailDTO {
  deadlineTime: Date;
}

export const useDeadlines = () => {
  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: taskKeys.all,
    queryFn: getAllTasks,
  });

  // Filter tasks that have endTime in the future and are not done
  const deadlines: DeadlineTask[] = allTasks
    .filter((task) => {
      if (task.isDone) return false;
      if (!task.endTime) return false;
      
      const endDate = new Date(task.endTime);
      return endDate > new Date();
    })
    .map((task) => ({
      ...task,
      deadlineTime: new Date(task.endTime!),
    }))
    .sort((a, b) => a.deadlineTime.getTime() - b.deadlineTime.getTime());

  return {
    deadlines,
    isLoading,
  };
};
