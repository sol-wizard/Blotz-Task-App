import { LabelDTO } from "../../../shared/models/label-dto";

export interface ExtractedTaskDTO {
  title: string;
  isValidTask: boolean;
  description: string;
  endTime: string;
  label?: LabelDTO;
}
