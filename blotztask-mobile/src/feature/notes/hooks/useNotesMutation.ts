import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNote, deleteNote, updateNote } from "../services/notes-service";
import { EditNoteDTO } from "../models/edit-note-dto";
import { noteKeys } from "@/shared/constants/query-key-factory";
import { CreateNoteDTO } from "../models/create-note-dto";

export const useNotesMutation = () => {
  const queryClient = useQueryClient();

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: (createNoteDto: CreateNoteDTO) => createNote(createNoteDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: (editNoteDto: EditNoteDTO) => updateNote(editNoteDto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });

  return {
    deleteNote: deleteNoteMutation.mutate,
    isNoteDeleting: deleteNoteMutation.isPending,
    createNote: createNoteMutation.mutate,
    createNoteAsync: createNoteMutation.mutateAsync,
    isNoteCreating: createNoteMutation.isPending,
    updateNote: updateNoteMutation.mutate,
    isNoteUpdating: updateNoteMutation.isPending,
  };
};
