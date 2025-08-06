import { TaskDetailDTO } from "@/models/task-detail-dto";
import { isSameDay } from "date-fns";

// Mock data - will be replaced with API calls later
let MOCK_TASKS: TaskDetailDTO[] = [
  {
    id: 1,
    description:
      "Prepare the monthly sales report and send it to the finance team.",
    title: "Monthly Sales Report",
    isDone: false,
    label: { labelId: 1, name: "Work", color: "#1E90FF" },
    endTime: new Date("2025-08-10T17:00:00Z"),
    hasTime: true,
  },
  {
    id: 2,
    description:
      "Buy groceries for the week including fruits, vegetables, and dairy.",
    title: "Grocery Shopping",
    isDone: true,
    label: { labelId: 2, name: "Personal", color: "#32CD32" },
    endTime: new Date("2025-08-06T10:00:00Z"),
    hasTime: true,
  },
  {
    id: 3,
    description:
      "Schedule a meeting with the product team to review Q3 roadmap.",
    title: "Product Team Meeting",
    isDone: false,
    label: { labelId: 3, name: "Meeting", color: "#FFD700" },
    endTime: new Date("2025-08-08T14:30:00Z"),
    hasTime: true,
  },
  {
    id: 4,
    description: "Renew gym membership before it expires next week.",
    title: "Gym Membership Renewal",
    isDone: false,
    label: { labelId: 4, name: "Health", color: "#FF4500" },
    endTime: new Date("2025-08-12T12:00:00Z"),
    hasTime: false,
  },
];

export const fetchTasksForDate = async (
  date: Date
): Promise<TaskDetailDTO[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_TASKS.filter((task) => isSameDay(task.endTime, date));
};

export const toggleTaskCompletion = async (
  taskId: number
): Promise<TaskDetailDTO[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));

  MOCK_TASKS = MOCK_TASKS.map((task) =>
    task.id === taskId ? { ...task, checked: !task.isDone } : task
  );

  return [...MOCK_TASKS];
};

export const addTask = async (
  taskData: Omit<TaskDetailDTO, "id">
): Promise<TaskDetailDTO[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  const newTask: TaskDetailDTO = {
    ...taskData,
    id: Date.now() + Math.floor(Math.random() * 1000), // Simple ID generation for mock
  };

  MOCK_TASKS.push(newTask);
  return [...MOCK_TASKS];
};

export const updateTask = async (
  taskId: number,
  updates: Partial<Omit<TaskDetailDTO, "id">>
): Promise<TaskDetailDTO[]> => {
  await new Promise((resolve) => setTimeout(resolve, 100));

  MOCK_TASKS = MOCK_TASKS.map((task) =>
    task.id === taskId ? { ...task, ...updates } : task
  );

  return [...MOCK_TASKS];
};

export const deleteTask = async (taskId: number): Promise<TaskDetailDTO[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));

  MOCK_TASKS = MOCK_TASKS.filter((task) => task.id !== taskId);
  return [...MOCK_TASKS];
};

export const fetchTasksByStatus = async (
  completed: boolean
): Promise<TaskDetailDTO[]> => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return MOCK_TASKS.filter((task) => task.isDone === completed);
};
