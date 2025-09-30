import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { TaskStatusSelectItem, TaskStatusType } from "../components/ui/task-status-select";

// TODO: Reflect real data for in progress and overdue tasks
export interface TaskCounts {
  todo: number;
  done: number;
  inProgress: number;
  overdue: number;
}

export function calculateTaskCounts(tasks: TaskDetailDTO[]): TaskCounts {
  const todo = tasks.filter((task) => !task.isDone).length;
  const done = tasks.filter((task) => task.isDone).length;

  const today = new Date();
  const inProgress = tasks.filter((task) => {
    if (!task.startTime || !task.endTime) return false;
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    return !task.isDone && today >= start && today < end;
  }).length;
  const overdue = tasks.filter((task) => {
    if (!task.endTime) return false;
    const end = new Date(task.endTime);
    return !task.isDone && end < today;
  }).length;

  return { todo, done, inProgress, overdue };
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
      count: counts.inProgress,
    },
    {
      id: "done",
      status: "Done",
      count: counts.done,
    },
    {
      id: "overdue",
      status: "Overdue",
      count: counts.overdue,
    },
  ];
}

export function filterTasksByStatus(
  tasks: TaskDetailDTO[],
  selectedStatus: TaskStatusType,
): TaskDetailDTO[] | null {
  const today = new Date();
  switch (selectedStatus) {
    case "todo":
      return tasks.filter((task) => !task.isDone);
    case "done":
      return tasks.filter((task) => task.isDone);
    case "all":
      return tasks;
    case "overdue":
      return tasks.filter((task) => {
        if (!task.endTime) return false;
        const end = new Date(task.endTime);
        return !task.isDone && end < today;
      });
    case "inprogress":
      return tasks.filter((task) => {
        if (!task.startTime || !task.endTime) return false;
        const start = new Date(task.startTime);
        const end = new Date(task.endTime);
        return !task.isDone && today >= start && today < end;
      });
    default:
      return tasks;
  }
}
