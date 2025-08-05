import { isSameDay } from 'date-fns';
import { TaskDTO } from '../models/task-dto';

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
let MOCK_TASKS: TaskDTO[] = [
  { id: '1', name: 'Team Meeting', date: getToday(), checked: true },
  { id: '2', name: 'Swimming', date: getToday(), checked: false },
  { id: '3', name: 'Grocery', date: getYesterday(), checked: false },
  { id: '4', name: 'Update Portfolio', date: getTomorrow(), checked: false },
];

export const fetchTasksForDate = async (date: Date): Promise<TaskDTO[]> => {
  await new Promise(resolve => setTimeout(resolve, 50));
  return MOCK_TASKS.filter(task => isSameDay(task.date, date));
};

export const toggleTaskCompletion = async (taskId: string): Promise<TaskDTO[]> => {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  MOCK_TASKS = MOCK_TASKS.map(task =>
    task.id === taskId 
      ? { ...task, checked: !task.checked }
      : task
  );
  
  return [...MOCK_TASKS];
};

export const addTask = async (taskData: Omit<TaskDTO, 'id'>): Promise<TaskDTO[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const newTask: TaskDTO = {
    ...taskData,
    id: Date.now().toString(), // Simple ID generation for mock
  };
  
  MOCK_TASKS.push(newTask);
  return [...MOCK_TASKS];
};

export const updateTask = async (taskId: string, updates: Partial<Omit<TaskDTO, 'id'>>): Promise<TaskDTO[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  MOCK_TASKS = MOCK_TASKS.map(task =>
    task.id === taskId
      ? { ...task, ...updates }
      : task
  );
  
  return [...MOCK_TASKS];
};

export const deleteTask = async (taskId: string): Promise<TaskDTO[]> => {
  await new Promise(resolve => setTimeout(resolve, 50));
  
  MOCK_TASKS = MOCK_TASKS.filter(task => task.id !== taskId);
  return [...MOCK_TASKS];
};

export const fetchTasksByStatus = async (completed: boolean): Promise<TaskDTO[]> => {
  await new Promise(resolve => setTimeout(resolve, 50));
  return MOCK_TASKS.filter(task => task.checked === completed);
};
