import { FloatingTaskDTO } from "../models/floating-task-dto";
import { useFloatingTasksSearch } from "./useFloatingTasksSearch";
import { useDebounce } from "use-debounce";

export const useStarSparkSearchEffects = ({
  searchQuery,
  floatingTasks,
  isLoadingAll,
  debouncedMs = 300,
}: {
  searchQuery: string;
  floatingTasks: FloatingTaskDTO[] | undefined;
  isLoadingAll: boolean;
  debouncedMs?: number;
}) => {
  const trimmedKeyword = searchQuery.trim();
  const hasKeyword = trimmedKeyword.length > 0;
  const [debouncedQuery] = useDebounce(
    hasKeyword ? trimmedKeyword : "",
    debouncedMs
  );

  const {
    data: searchedTasks,
    isLoading: isSearching,
    isError: isSearchError,
    error: searchError,
  } = useFloatingTasksSearch(debouncedQuery);

  const floatingTasksResult = hasKeyword ? searchedTasks ?? [] : floatingTasks ?? [];
  const showLoading = isLoadingAll || (hasKeyword && isSearching);

  return {
    floatingTasksResult,
    showLoading,
    isSearchError,
    searchError
  };
};
