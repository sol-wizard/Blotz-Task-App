import { useDebounce } from "use-debounce";
import { taskKeys } from "@/shared/constants/query-key-factory";
import { useQuery } from "@tanstack/react-query";
import { NoteDTO } from "../models/note-dto";

const mockNotes: NoteDTO[] = [
  { id: 1, text: "Draft weekly plan", createdAt: "2024-03-18T09:30:00" },
  { id: 2, text: "Review pull request #214", createdAt: "2024-03-18T11:05:00" },
  { id: 3, text: "Prep for design sync", createdAt: "2024-03-19T08:10:00" },
  { id: 4, text: "Send status update", createdAt: "2024-03-19T15:45:00" },
];

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

  const { data: allNotes, isLoading } = useQuery<NoteDTO[]>({
    queryKey: taskKeys.floating(),
    queryFn: async () => mockNotes,
  });

  const normalizedQuery = debouncedQuery.toLowerCase();
  const notesSearchResult = hasKeyword
    ? (allNotes ?? []).filter((note) => note.text.toLowerCase().includes(normalizedQuery))
    : (allNotes ?? []);
  const showLoading = isLoading;

  return {
    notesSearchResult,
    showLoading,
  };
};
