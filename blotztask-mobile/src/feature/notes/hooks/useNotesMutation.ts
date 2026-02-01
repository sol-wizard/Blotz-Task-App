import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNote } from "../services/notes-service";
import { noteKeys } from "@/shared/constants/query-key-factory";

export const useNotesMutation = () => {
  const queryClient = useQueryClient();

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });

  return {
    deleteNote: deleteNoteMutation.mutate,
    isNoteDeleting: deleteNoteMutation.isPending,
  };
};
