import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { isBefore } from "date-fns";
import { TaskFilterGroup } from "../modals/task-filter-group";

export function filterSelectedTask(selectedDayTasks: TaskDetailDTO[]): TaskFilterGroup[] {
  const today = new Date();
  const todoTasks = selectedDayTasks.filter((task) => isTodo(task));
  const doneTasks = selectedDayTasks.filter((task) => task.isDone);

  const inProgressTasks = selectedDayTasks.filter((task) => {
    if (!task.startTime || !task.endTime) return false;
    const start = new Date(task.startTime);
    const end = new Date(task.endTime);
    return !task.isDone && today >= start && today < end;
  });

  const overdueTasks = selectedDayTasks.filter((task) => {
    if (!task.endTime) return false;
    return !task.isDone && isBefore(new Date(task.endTime), new Date());
  });
  const allTasks = [...todoTasks, ...doneTasks, ...inProgressTasks, ...overdueTasks];

  const todoTaskCount = todoTasks.length;
  const inProgressTaskCount = inProgressTasks.length;
  const doneTaskCount = doneTasks.length;
  const overdueTaskCount = overdueTasks.length;
  const allTaskCount = allTasks.length;

  return [
    {
      status: "All",
      count: allTaskCount,
      tasks: allTasks,
    },
    {
      status: "To Do",
      count: todoTaskCount,
      tasks: todoTasks,
    },
    {
      status: "In Progress",
      count: inProgressTaskCount,
      tasks: inProgressTasks,
    },
    {
      status: "Done",
      count: doneTaskCount,
      tasks: doneTasks,
    },
    {
      status: "Overdue",
      count: overdueTaskCount,
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
