// This data type is passed from the ai chat endpoint
export interface ExtractedTaskDTO {
  id: string;
  title: string;
  isValidTask: boolean;
  description: string;
  start_time: string;
  end_time: string;
  task_label: string;
}
