export interface AiResultMessageDTO {
  isSuccess: boolean;
  extractedTasks?: ExtractedTaskDTO[];
  extractedNotes?: AiNoteDTO[];
  errorMessage?: string;
}

export interface AiNoteDTO {
  id: string;
  text: string;
}

export interface ExtractedTaskDTO {
  id: string;
  title: string;
  isValidTask: boolean;
  description: string;
  start_time: string;
  end_time: string;
  task_label: string;
}
