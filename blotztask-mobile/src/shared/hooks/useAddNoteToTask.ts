import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { convertNoteToTask } from "@/feature/notes/services/notes-service";
import { taskKeys, noteKeys } from "@/shared/constants/query-key-factory";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { invalidateSelectedDayTask } from "./useTaskMutations";

export type AddNoteToTaskParams = {
  note: NoteDTO | null;
  startTime?: Date;
  endTime?: Date;
  timeType?: number;
  onSuccess?: () => void;
};

export const useAddNoteToTask = () => {
  const queryClient = useQueryClient();

  const convertMutation = useMutation({
    mutationFn: async ({ note, startTime, endTime }: AddNoteToTaskParams) => {
      if (!note) throw new Error("No note");
      const start = startTime ?? new Date();
      const end = endTime ?? new Date(start.getTime() + 60 * 60 * 1000);
      const startTimeStr = convertToDateTimeOffset(start);
      const endTimeStr = convertToDateTimeOffset(end);
      return convertNoteToTask(note.id, startTimeStr, endTimeStr);
    },
    onSuccess: (_taskId, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
      const start = variables.startTime ?? new Date();
      const end = variables.endTime ?? new Date(start.getTime() + 60 * 60 * 1000);
      invalidateSelectedDayTask(queryClient, start.toISOString(), end.toISOString());
      variables.onSuccess?.();
    },
  });

  return {
    addNoteToTask: convertMutation.mutate,
    isConverting: convertMutation.isPending,
  };
};
