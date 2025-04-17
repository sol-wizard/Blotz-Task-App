import { LabelDTO } from "./label-dto";

export interface ExtractedTask {
    title: string;
    due_date: string | null;
    message: string;
    isValidTask: boolean;
    description?: string;
    label?: LabelDTO;
  }