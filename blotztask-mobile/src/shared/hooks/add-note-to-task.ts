import { useQueryClient } from "@tanstack/react-query";
import { addDays, isSameDay, startOfDay } from "date-fns";
import { NoteDTO } from "@/feature/notes/models/note-dto";
import { convertNoteToTask } from "@/feature/notes/services/notes-service";
import { taskKeys, noteKeys } from "@/shared/constants/query-key-factory";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";

type AddNoteToTaskParams = {
  note: NoteDTO | null;
  startTime?: Date;
  endTime?: Date;
  timeType?: number;
  onSuccess?: () => void;
};

function invalidateSelectedDayTask(
  queryClient: ReturnType<typeof useQueryClient>,
  startTime: string,
  endTime: string,
) {
  const start = startOfDay(new Date(startTime));
  const end = startOfDay(new Date(endTime));
  if (isSameDay(start, end)) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.selectedDay(convertToDateTimeOffset(start)),
    });
    return;
  }
  let cursorDay = startOfDay(start);
  while (cursorDay <= end) {
    queryClient.invalidateQueries({
      queryKey: taskKeys.selectedDay(convertToDateTimeOffset(cursorDay)),
    });
    cursorDay = addDays(cursorDay, 1);
  }
}

export const useAddNoteToTask = () => {
  const queryClient = useQueryClient();

  return async ({ note, startTime, endTime, onSuccess }: AddNoteToTaskParams) => {
    if (!note) return;
    const start = startTime ?? new Date();
    const end = endTime ?? new Date(start.getTime() + 60 * 60 * 1000);
    const startTimeStr = convertToDateTimeOffset(start);
    const endTimeStr = convertToDateTimeOffset(end);

    try {
      const task = await convertNoteToTask(note.id, startTimeStr, endTimeStr);
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
      invalidateSelectedDayTask(queryClient, task.startTime, task.endTime);
      onSuccess?.();
    } catch {
      // On failure: do not remove the original note from UI
    }
  };
};
