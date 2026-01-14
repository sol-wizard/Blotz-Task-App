import { fetchStarSparkFloatingTasks } from "@/shared/services/task-service";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { useQuery } from "@tanstack/react-query";

export const useFloatingTasks = () => {
  const { data: floatingTasks, isLoading } = useQuery({
    queryKey: taskKeys.floating(),
    queryFn: () => fetchStarSparkFloatingTasks(),
  });

  return {
    floatingTasks,
    isLoading,
  };
};
