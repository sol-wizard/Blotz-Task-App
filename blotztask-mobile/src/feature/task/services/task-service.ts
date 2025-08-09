import { TaskDetailDTO } from "@/shared/models/task-detail-dto";
import { fetchWithAuth } from "@/shared/services/fetch-with-auth";
import { isSameDay } from "date-fns";
import { RawAddTaskDTO } from "../models/raw-add-task-dto";
import { AddTaskItemDTO } from "../models/add-task-item-dto";

// Helper function to get dates relative to today
const getToday = () => new Date();
const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
};
const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
};

// Mock data - will be replaced with API calls later
let MOCK_TASKS: TaskDetailDTO[] = [
  {
    id: 1,
    description:
      "Prepare the monthly sales report and send it to the finance team.",
    title: "Monthly Sales Report",
    isDone: false,
    label: { labelId: 1, name: "Work", color: "#1E90FF" },
    endTime: getToday(),
  },
  {
    id: 2,
    description:
      "Buy groceries for the week including fruits, vegetables, and dairy.",
    title: "Grocery Shopping",
    isDone: true,
    label: { labelId: 2, name: "Personal", color: "#32CD32" },
    endTime: getToday(),
  },
  {
    id: 3,
    description:
      "Schedule a meeting with the product team to review Q3 roadmap.",
    title: "Product Team Meeting",
    isDone: false,
    label: { labelId: 3, name: "Meeting", color: "#FFD700" },
    endTime: getYesterday(),
  },
  {
    id: 4,
    description: "Renew gym membership before it expires next week.",
    title: "Gym Membership Renewal",
    isDone: false,
    label: { labelId: 4, name: "Health", color: "#FF4500" },
    endTime: getTomorrow(),
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

export const addTaskItem = async (
  addTaskForm: AddTaskItemDTO
): Promise<TaskDetailDTO> => {
  try {
    const result = await fetchWithAuth<TaskDetailDTO>(
      `${process.env.NEXT_PUBLIC_API_BASE_URL_WITH_API}/Task`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addTaskForm),
      }
    );

    return result;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};
