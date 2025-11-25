import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { isAfter, isBefore, isSameDay } from "date-fns";
import { TaskFilterGroup } from "../models/task-filter-group";

export function filterSelectedTask({
  selectedDayTasks,
  selectedDay,
}: {
  selectedDayTasks: TaskDetailDTO[];
  selectedDay?: Date;
}): TaskFilterGroup[] {
  const allTasks = selectedDayTasks;
  const todoTasks = selectedDayTasks.filter(isTodo);
  const inProgressTasks = selectedDayTasks.filter(isInProgress);
  const overdueTasks = selectedDayTasks.filter(isOverdue);

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
