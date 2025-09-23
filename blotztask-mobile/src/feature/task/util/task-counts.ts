import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { LabelSelectItem } from "../ui/components/label-select/label-select";

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

export function createLabelSelectItems(tasks: TaskDetailDTO[]): LabelSelectItem[] {
  const counts = calculateTaskCounts(tasks);

  return [
    {
      id: "all",
      label: "All",
      count: tasks.length,
    },
    {
      id: "todo",
      label: "To Do",
      count: counts.todo,
    },
    {
      id: "inprogress",
      label: "In Progress",
      count: tasks.length,
    },
    {
      id: "done",
      label: "Done",
      count: counts.done,
    },
    {
      id: "overdue",
      label: "Overdue",
      count: tasks.length,
    },
  ];
}

export function filterTasksByLabel(tasks: TaskDetailDTO[], selectedLabel: string): TaskDetailDTO[] {
  switch (selectedLabel) {
    case "todo":
      return tasks.filter((task) => !task.isDone);
    case "done":
      return tasks.filter((task) => task.isDone);
    case "all":
    default:
      return tasks;
  }
}
