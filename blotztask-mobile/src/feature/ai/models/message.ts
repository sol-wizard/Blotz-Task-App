import { TaskDetailDTO } from "./task-detail-dto";

export type Message = {
  id: number;
  text: string;
  from: "user" | "bot";
  tasks?: TaskDetailDTO[];
};
