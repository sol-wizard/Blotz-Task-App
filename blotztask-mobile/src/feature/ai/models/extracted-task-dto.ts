import { LabelDTO } from "../../../shared/models/label-dto";

export interface ExtractedTaskDTO {
  title: string;
  due_date: string | null;
  isValidTask: boolean; //
  description?: string;
  label?: LabelDTO;
}
