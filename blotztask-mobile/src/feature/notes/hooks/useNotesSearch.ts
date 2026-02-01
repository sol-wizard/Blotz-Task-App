import { useDebounce } from "use-debounce";
import { noteKeys } from "@/shared/constants/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { searchNotes } from "../services/search-notes-service";

export const useNotesSearch = ({
  searchQuery,
  debouncedMs = 300,
}: {
  searchQuery: string;
  debouncedMs?: number;
}) => {
  const trimmedKeyword = searchQuery.trim();
  const hasKeyword = trimmedKeyword.length > 0;
  const [debouncedQuery] = useDebounce(hasKeyword ? trimmedKeyword : "", debouncedMs);

  console.log("Debounced Query:", debouncedQuery);

  const { data: allNotes, isLoading } = useQuery({
    queryKey: [...noteKeys.all, debouncedQuery],
    queryFn: () => searchNotes(debouncedQuery),
  });

  const notesSearchResult = allNotes ?? [];
  const showLoading = isLoading;

  return {
    notesSearchResult,
    showLoading,
  };
};
