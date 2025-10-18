import { useQuery } from "@tanstack/react-query";
import { getSubtasksByParentId } from "@/shared/services/subtask-service";
import { SubtaskDTO } from "@/feature/breakdown/models/subtask-dto";

export const useSubtaskQueries = () => {
  const useSubtasksByParentIdQuery = (parentId: number) => {
    return useQuery<SubtaskDTO[], Error>({
      queryKey: ["subtasks", parentId],
      queryFn: () => getSubtasksByParentId(parentId),
      enabled: !!parentId,
    });
  };

  return {
    useSubtasksByParentId: useSubtasksByParentIdQuery,
  };
};
