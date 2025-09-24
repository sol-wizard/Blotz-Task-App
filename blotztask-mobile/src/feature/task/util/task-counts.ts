import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { TaskStatusSelectItem, TaskStatusType } from "../components/ui/task-status-select";

// TODO: Reflect real data for in progress and overdue tasks
export interface TaskCounts {
  todo: number;
  done: number;
}

export function calculateTaskCounts(tasks: TaskDetailDTO[]): TaskCounts {
  const todo = tasks.filter((task) => !task.isDone).length;
  const done = tasks.filter((task) => task.isDone).length;

  return { todo, done };
}

export function createStatusSelectItems(tasks: TaskDetailDTO[]): TaskStatusSelectItem[] {
  const counts = calculateTaskCounts(tasks);

  return [
    {
      id: "all",
      status: "All",
      count: tasks.length,
    },
    {
      id: "todo",
      status: "To Do",
      count: counts.todo,
    },
    {
      id: "inprogress",
      status: "In Progress",
      count: 0,
    },
    {
      id: "done",
      status: "Done",
      count: counts.done,
    },
    {
      id: "overdue",
      status: "Overdue",
      count: 0,
    },
  ];
}

export function filterTasksByStatus(
  tasks: TaskDetailDTO[],
  selectedStatus: TaskStatusType,
): TaskDetailDTO[] | null {
  switch (selectedStatus) {
    case "todo":
      return tasks.filter((task) => !task.isDone);
    case "done":
      return tasks.filter((task) => task.isDone);
    case "all":
      return tasks;
    case "overdue":
      return null;
    case "inprogress":
      return null;
    default:
      return tasks;
  }
}
