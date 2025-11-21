import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { isAfter, isBefore, isSameDay } from "date-fns";
import { TaskFilterGroup } from "../models/task-filter-group";

export function filterSelectedTask({
  selectedDayTasks,
  selectedDay,
}: {
  selectedDayTasks: TaskDetailDTO[];
  selectedDay: Date;
}): TaskFilterGroup[] {
  const today = new Date();

  const todoTasks: TaskDetailDTO[] = [];
  const inProgressTasks: TaskDetailDTO[] = [];
  const doneTasks: TaskDetailDTO[] = [];
  const overdueTasks: TaskDetailDTO[] = [];
  const allTasks: TaskDetailDTO[] = [];

  const isInProgress = (task: TaskDetailDTO) => {
    if (!task.startTime || !task.endTime) return false;
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    return !task.isDone && today >= start && today < end;
  };

  const isOverdue = (task: TaskDetailDTO) => {
    if (!task.endTime) return false;
    return !task.isDone && isBefore(new Date(task.endTime), today);
  };

  for (const task of selectedDayTasks) {
    const isTaskTodo = isTodo(task);
    const isTaskInProgress = isInProgress(task);
    const isTaskDone = task.isDone;
    const isTaskOverdue = isOverdue(task);

    if (isTaskTodo) todoTasks.push(task);
    if (isTaskInProgress) inProgressTasks.push(task);
    if (isTaskDone) doneTasks.push(task);
    if (isTaskOverdue) overdueTasks.push(task);

    if (isAfter(selectedDay, today)) {
      if (isTaskTodo || isTaskInProgress) allTasks.push(task);
    } else if (isBefore(selectedDay, today)) {
      if (isTaskDone || isTaskOverdue) allTasks.push(task);
    }
  }

  const finalAllTasks = isSameDay(selectedDay, today) ? selectedDayTasks : allTasks;

  return [
    {
      status: "All",
      count: finalAllTasks.length,
      tasks: finalAllTasks,
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

function isTodo(task: TaskDetailDTO): boolean {
  if (task.isDone) return false;

  const nowTime = Date.now();

  if (task.endTime && new Date(task.endTime).getTime() <= nowTime) return false;
  if (task.startTime && new Date(task.startTime).getTime() <= nowTime) return false;

  return true;
}
