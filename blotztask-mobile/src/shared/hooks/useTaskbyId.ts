import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTaskById } from "../services/task-service";

export const useTaskById = ({ taskId }: { taskId: number }) => {
  const qc = useQueryClient();
  const { data: selectedTask, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTaskById(taskId),
    initialData: () => qc.getQueryData(["task", taskId]),
  });

  return {
    selectedTask,
    isLoading,
  };
};
