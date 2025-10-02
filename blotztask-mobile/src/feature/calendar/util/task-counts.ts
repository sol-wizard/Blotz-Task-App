import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { TaskStatusSelectItem, TaskStatusType } from "../components/task-status-select";

// TODO: Reflect real data for in progress and overdue tasks
export interface TaskCounts {
  todo: number;
  done: number;
  inProgress: number;
}

export function calculateTaskCounts(tasks: TaskDetailDTO[]): TaskCounts {
  const todo = tasks.filter((task) => isTodo(task)).length;
  const done = tasks.filter((task) => task.isDone).length;

  const today = new Date();
  const inProgress = tasks.filter((task) => {
    if (!task.startTime || !task.endTime) return false;
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    return !task.isDone && today >= start && today < end;
  }).length;

  return { todo, done, inProgress };
}

export function createStatusSelectItems({
  tasks,
  overdueTaskCount,
}: {
  tasks: TaskDetailDTO[];
  overdueTaskCount: number;
}): TaskStatusSelectItem[] {
  const counts = calculateTaskCounts(tasks);
  const allTaskCount = counts.todo + counts.done + counts.inProgress + overdueTaskCount;

  return [
    {
      id: "all",
      status: "All",
      count: allTaskCount,
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
      count: overdueTaskCount,
    },
  ];
}

export function filterTasksByStatus(
  tasks: TaskDetailDTO[],
  selectedStatus: TaskStatusType,
  overdueTasks: TaskDetailDTO[],
): TaskDetailDTO[] {
  const today = new Date();
  const todoTasks = tasks.filter((task) => isTodo(task));
  const doneTasks = tasks.filter((task) => task.isDone);

  const inProgressTasks = tasks.filter((task) => {
    if (!task.startTime || !task.endTime) return false;
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    return !task.isDone && today >= start && today < end;
  });
  const allTasks = [...todoTasks, ...doneTasks, ...inProgressTasks, ...overdueTasks];

  switch (selectedStatus) {
    case "todo":
      return todoTasks;

    case "done":
      return doneTasks;

    case "inprogress":
      return inProgressTasks;

    case "overdue":
      return overdueTasks;

    case "all":
      return allTasks;

    default:
      return allTasks;
  }
}

function isTodo(task: TaskDetailDTO): boolean {
  if (task.isDone) return false;

  const nowTime = Date.now();

  if (task.endTime && new Date(task.endTime).getTime() <= nowTime) return false;
  if (task.startTime && new Date(task.startTime).getTime() <= nowTime) return false;

  return true;
}
