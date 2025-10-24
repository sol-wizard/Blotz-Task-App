import { useQuery } from "@tanstack/react-query";
import { getSubtasksByParentId } from "@/feature/task-details/services/subtask-service";
import { SubtaskDTO } from "@/feature/task-details/models/subtask-dto";

export const useSubtasksByParentId = (parentId: number) => {
  return useQuery<SubtaskDTO[], Error>({
    queryKey: ["subtasks", parentId],
    queryFn: () => getSubtasksByParentId(parentId),
    enabled: !!parentId,
  });
};
