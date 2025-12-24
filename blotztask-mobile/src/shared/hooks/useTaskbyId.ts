import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTaskById } from "../services/task-service";
import { taskKeys } from "../util/query-key-factory";

export const useTaskById = ({ taskId }: { taskId: number }) => {
  const qc = useQueryClient();
  const {
    data: selectedTask,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: taskKeys.byId(taskId),
    queryFn: () => fetchTaskById(taskId),
    initialData: () => qc.getQueryData(taskKeys.byId(taskId)),
  });

  return {
    selectedTask,
    isLoading,
    isFetching,
  };
};
