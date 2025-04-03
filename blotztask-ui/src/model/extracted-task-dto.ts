export interface ExtractedTask {
    title: string;
    due_date: string | null;
    message: string;
    isValidTask: boolean;
    description?: string;
    labelId?: number;
  }