import { LabelDTO } from "./label-dto";

export interface ExtractedTask {
    title: string;
    endTime: string | null;
    message: string;
    isValidTask: boolean;
    description?: string;
    label?: LabelDTO;
  }