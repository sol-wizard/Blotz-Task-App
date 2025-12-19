import { FloatingTaskDTO } from "../models/floating-task-dto";
import { fetchFloatingTasksByQuery } from "@/shared/services/task-service";
import { useQuery } from "@tanstack/react-query";

export const useFloatingTasksSearch = (keyword: string) => {
  const trimmedKeyword = keyword.trim();

  return useQuery<FloatingTaskDTO[]>({
    queryKey: ["floatingTasks","search", trimmedKeyword],
    enabled: trimmedKeyword.length > 0,
    queryFn: () => fetchFloatingTasksByQuery(trimmedKeyword)
  })
}