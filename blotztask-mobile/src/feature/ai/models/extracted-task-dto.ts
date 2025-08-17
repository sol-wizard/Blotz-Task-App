import { LabelDTO } from "../../../shared/models/label-dto";
// This data type is passed from the ai chat endpoint
export interface ExtractedTaskDTO {
  title: string;
  isValidTask: boolean;
  description: string;
  endTime: string;
  label?: LabelDTO;
}
