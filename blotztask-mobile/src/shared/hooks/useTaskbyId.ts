import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTaskById } from "../services/task-service";
import { taskKeys } from "../constants/query-key-factory";

export const useTaskById = ({ taskId, enabled = true }: { taskId: number | null; enabled?: boolean }) => {
  const qc = useQueryClient();
  const {
    data: selectedTask,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: taskKeys.byId(taskId ?? 0),
    queryFn: () => fetchTaskById(taskId!),
    initialData: () => (taskId == null ? undefined : qc.getQueryData(taskKeys.byId(taskId))),
    enabled: enabled && taskId != null,
  });

  return {
    selectedTask,
    isLoading,
    isFetching,
  };
};
