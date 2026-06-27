import { useDebounce } from "use-debounce";
import { noteKeys } from "@/shared/constants/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { searchNotes } from "../services/notes-service";
import { NoteDTO } from "../models/note-dto";

const EMPTY_NOTES: NoteDTO[] = [];

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

  const { data: allNotes, isLoading } = useQuery({
    queryKey: [...noteKeys.all, debouncedQuery],
    queryFn: () => searchNotes(debouncedQuery),
  });

  const notesSearchResult = allNotes ?? EMPTY_NOTES;
  const showLoading = isLoading;

  return {
    notesSearchResult,
    showLoading,
  };
};
