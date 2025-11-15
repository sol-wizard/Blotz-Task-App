import { fetchFloatingTasks } from "@/shared/services/task-service";
import { useQuery } from "@tanstack/react-query";

export const useFloatingTasks = () => {
  const { data: floatingTasks, isLoading } = useQuery({
    queryKey: ["floatingTasks"],
    queryFn: () => fetchFloatingTasks(),
  });

  return {
    floatingTasks,
    isLoading,
  };
};
