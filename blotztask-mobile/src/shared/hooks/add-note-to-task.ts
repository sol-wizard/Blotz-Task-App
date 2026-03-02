import { NoteDTO } from "@/feature/notes/models/note-dto";
import { convertToDateTimeOffset } from "@/shared/util/convert-to-datetimeoffset";
import useTaskMutations from "@/shared/hooks/useTaskMutations";

type AddNoteToTaskParams = {
  note: NoteDTO | null;
  startTime?: Date;
  endTime?: Date;
  timeType?: number;
  onSuccess?: () => void;
};

export const useAddNoteToTask = () => {
  const { addTask } = useTaskMutations();

  return ({ note, startTime, endTime, timeType = 1, onSuccess }: AddNoteToTaskParams) => {
    if (!note) return;
    const text = note.text ?? "";

    const title = text.length > 50 ? text.slice(0, 50) : text;
    const description = text.length > 50 ? text : "";

    const start = startTime ?? new Date();
    const end = endTime ?? new Date(start.getTime() + 60 * 60 * 1000);

    addTask({
      title,
      description,
      startTime: convertToDateTimeOffset(start),
      endTime: convertToDateTimeOffset(end),
      timeType,
    });

    onSuccess?.();
  };
};
