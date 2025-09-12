import { Timespan } from "react-native/Libraries/Utilities/IPerformanceLogger";

export interface SubtaskDTO {
  taskId: number;
  subtaskId: number;
  title?: string;
  description?: string;
  duration?: Timespan;
  isDone?: boolean;
}
