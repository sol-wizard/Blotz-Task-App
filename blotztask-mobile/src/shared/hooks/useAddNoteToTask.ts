import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { convertNoteToTask } from "@/feature/notes/services/notes-service";
import { taskKeys, noteKeys } from "@/shared/constants/query-key-factory";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import { invalidateSelectedDayTask } from "./useTaskMutations";

export type AddNoteToTaskParams = {
  note: NoteDTO;
  startTime: Date;
  endTime: Date;
  onSuccess?: () => void;
};

export const useAddNoteToTask = () => {
  const queryClient = useQueryClient();

  const convertMutation = useMutation({
    mutationFn: async ({ note, startTime, endTime }: AddNoteToTaskParams) => {
      const startTimeStr = convertToDateTimeOffset(startTime);
      const endTimeStr = convertToDateTimeOffset(endTime);
      return convertNoteToTask(note.id, startTimeStr, endTimeStr);
    },
    onSuccess: (_taskId, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
      invalidateSelectedDayTask(
        queryClient,
        variables.startTime.toISOString(),
        variables.endTime.toISOString(),
      );
      variables.onSuccess?.();
    },
  });

  return {
    addNoteToTask: convertMutation.mutate,
    isConverting: convertMutation.isPending,
  };
};
