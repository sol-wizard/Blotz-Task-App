import { ExtractedTaskDTO } from "./extracted-task-dto";
import { AiNoteDTO } from "./ai-note-dto";

export interface AiResultMessageDTO {
  isSuccess: boolean;
  extractedTasks?: ExtractedTaskDTO[];
  extractedNotes?: AiNoteDTO[];
  errorMessage?: string;
}
