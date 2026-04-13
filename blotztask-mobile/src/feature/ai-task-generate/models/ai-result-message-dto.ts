export interface AiResultMessageDTO {
  isSuccess: boolean;
  userInput?: string;
  extractedTasks?: ExtractedTaskDTO[];
  extractedNotes?: AiNoteDTO[];
  errorCode?: string;
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
