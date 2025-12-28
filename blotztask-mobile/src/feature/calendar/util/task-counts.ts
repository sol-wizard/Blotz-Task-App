import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
// import { isBefore, parseISO, startOfDay } from "date-fns";
import { isBefore } from "date-fns";
import { TaskFilterGroup } from "../models/task-filter-group";

export function filterSelectedTask({
  selectedDayTasks,
}: {
  selectedDayTasks: TaskDetailDTO[];
}): TaskFilterGroup[] {
  const allTasks = selectedDayTasks;

  const todoTasks: TaskDetailDTO[] = [];
  const inProgressTasks: TaskDetailDTO[] = [];
  const doneTasks: TaskDetailDTO[] = [];
  const overdueTasks: TaskDetailDTO[] = [];

  for (const task of selectedDayTasks) {
    const isTaskTodo = isTodo(task);
    const isTaskInProgress = isInProgress(task);
    const isTaskDone = task.isDone;
    const isTaskOverdue = isOverdue(task);

    if (isTaskTodo) todoTasks.push(task);
    if (isTaskInProgress) inProgressTasks.push(task);
    if (isTaskDone) doneTasks.push(task);
    if (isTaskOverdue) overdueTasks.push(task);
  }

  return [
    {
      status: "All",
      count: allTasks.length,
      tasks: allTasks,
    },
    {
      status: "To Do",
      count: todoTasks.length,
      tasks: todoTasks,
    },
    {
      status: "In Progress",
      count: inProgressTasks.length,
      tasks: inProgressTasks,
    },
    {
      status: "Done",
      count: doneTasks.length,
      tasks: doneTasks,
    },
    {
      status: "Overdue",
      count: overdueTasks.length,
      tasks: overdueTasks,
    },
  ];
}

// function isTodo(task: TaskDetailDTO, selectedDay: Date): boolean {
function isTodo(task: TaskDetailDTO): boolean {
  if (task.isDone) return false;
  const nowTime = Date.now();

  if (task.endTime && new Date(task.endTime).getTime() <= nowTime) return false;
  if (task.startTime && new Date(task.startTime).getTime() <= nowTime) return false;
  return true;
}

const isInProgress = (task: TaskDetailDTO) => {
  if (!task.startTime || !task.endTime) return false;
  const start = new Date(task.startTime);
  const end = new Date(task.endTime);
  return !task.isDone && start <= new Date() && end > new Date();
};

const isOverdue = (task: TaskDetailDTO) => {
  if (!task.endTime) return false;
  return !task.isDone && isBefore(new Date(task.endTime), new Date());
};
