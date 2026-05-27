import { useQuery } from "@tanstack/react-query";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { getAllTasks } from "@/shared/services/task-service";

export function useAllTasksQuery() {
  const allTasksQuery = useQuery<TaskDetailDTO[]>({
    queryKey: taskKeys.all,
    queryFn: () => getAllTasks(),
  });

  return {
    allTasks: allTasksQuery.data ?? [],
    isAllTasksLoading: allTasksQuery.isLoading,
  };
}
