export interface AiResultMessageDTO {
  userInput?: string;
  extractedTasks?: ExtractedTaskDTO[];
  extractedNotes?: AiNoteDTO[];
  // SPIKE (#1462, throwaway): recurring tasks extracted from repeating-cadence intent.
  extractedRecurringTasks?: ExtractedRecurringTaskDTO[];
}

export interface AiGenerationErrorDTO {
  errorCode: string;
  errorMessage: string;
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

// SPIKE (#1462, throwaway): the recurring draft streamed on ReceiveRecurringTaskExtracted.
// snake_case fields mirror the backend ExtractedRecurringTask JsonPropertyName attributes.
export interface ExtractedRecurringTaskDTO {
  id: string;
  title: string;
  description: string;
  time_type: string; // "SingleTime" | "RangeTime"
  task_label: string; // "Work" | "Life" | "Learning" | "Health"
  template_start_time: string;
  template_end_time: string;
  frequency: string; // "Daily" | "Weekly" | "Monthly" | "Yearly"
  interval: number;
  days_of_week: number | null; // WeeklyDayFlags bitmask (Mon=1..Sun=64)
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
}
