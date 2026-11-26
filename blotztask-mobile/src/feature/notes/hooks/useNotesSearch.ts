import { useDebounce } from "use-debounce";
import { noteKeys } from "@/shared/constants/query-key-factory";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchNotes } from "../services/notes-service";

export const useNotesSearch = ({
  searchQuery,
  debouncedMs = 400,
}: {
  searchQuery: string;
  debouncedMs?: number;
}) => {
  const trimmedKeyword = searchQuery.trim();
  const hasKeyword = trimmedKeyword.length > 0;
  const [debouncedQuery] = useDebounce(hasKeyword ? trimmedKeyword : "", debouncedMs);

  const { data: allNotes, isLoading, isPlaceholderData, isFetching } = useQuery({
    queryKey: [...noteKeys.all, debouncedQuery],
    queryFn: () => searchNotes(debouncedQuery),
    placeholderData: keepPreviousData,
  });

  const notesSearchResult = allNotes ?? [];
  const isInitialLoading = isLoading && !allNotes;
  const isSearching = (isPlaceholderData || isFetching) && hasKeyword;

  return {
    notesSearchResult,
    isInitialLoading,
    isSearching,
    showLoading: isInitialLoading,
  };
};
