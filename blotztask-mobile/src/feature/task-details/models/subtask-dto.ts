import { Timespan } from "react-native/Libraries/Utilities/IPerformanceLogger";

export interface SubtaskDTO {
  subTaskId: number;
  parentTaskId: number;
  title: string;
  description?: string;
  duration?: Timespan;
  order: number;
  isDone: boolean;
}
