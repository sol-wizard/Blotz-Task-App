import { ExtractedTaskDTO } from "./extracted-task-dto";
import { ExtractedNoteDTO } from "./extracted-note-dto";

export interface AiResultMessageDTO {
  isSuccess: boolean;
  extractedTasks?: ExtractedTaskDTO[];
  extractedNotes?: ExtractedNoteDTO[];
  errorMessage?: string;
}
