import { LabelDTO } from "../../../shared/models/label-dto";

export interface ExtractedTask {
  title: string;
  due_date: string | null;
  isValidTask: boolean;
  description?: string;
  label?: LabelDTO;
}
