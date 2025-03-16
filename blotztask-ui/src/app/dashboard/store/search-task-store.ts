import { create } from 'zustand';
import { TaskDetailDTO } from '../task-list/models/task-detail-dto';

type SearchTaskStore = {
  query: string;
  setQuery: (query: string) => void;
  mockTasks: TaskDetailDTO[];
  filterTasks: () => TaskDetailDTO[];
  filteredTasks: TaskDetailDTO[];
  selectTasks: (taskId: number) => void;
};

export const useSearchTaskStore = create<SearchTaskStore>((set, get) => ({
  query: '',
  setQuery: (query) => set({ query }),
  filteredTasks: [],

  mockTasks: [
    {
      id: 1,
      title: 'Buy milk',
      description: 'From shopping center',
      isDone: false,
      label: { labelId: 6, name: 'Personal', color: '#FFFFFF' },
      dueDate: new Date('2025-03-14'),
    },
    {
      id: 2,
      title: 'Complete project report',
      description: 'Finalize and submit the project report',
      isDone: false,
      label: { labelId: 2, name: 'Work', color: '#FF5733' },
      dueDate: new Date('2025-03-20'),
    },
    {
      id: 3,
      title: 'Compz project report',
      description: 'Leg day at the gym',
      isDone: true,
      label: { labelId: 4, name: 'Health', color: '#33FF57' },
      dueDate: new Date('2025-03-12'),
    },
    {
      id: 4,
      title: "Doctor's appointment",
      description: 'Regular check-up',
      isDone: false,
      label: { labelId: 5, name: 'Health', color: '#57A0FF' },
      dueDate: new Date('2025-03-18'),
    },
    {
      id: 5,
      title: 'Team meeting',
      description: 'Weekly sprint planning',
      isDone: false,
      label: { labelId: 2, name: 'Work', color: '#FF5733' },
      dueDate: new Date('2025-03-15'),
    },
    {
      id: 6,
      title: 'Read a book',
      description: "Finish reading 'Atomic Habits'",
      isDone: true,
      label: { labelId: 3, name: 'Personal Development', color: '#FFD700' },
      dueDate: new Date('2025-03-10'),
    },
    {
      id: 7,
      title: 'Read two book',
      description: "Finish reading 'Atomic Habits'",
      isDone: false,
      label: { labelId: 6, name: 'Personal', color: '#FFFFFF' },
      dueDate: new Date('2025-03-16'),
    },
    {
      id: 8,
      title: 'Submit tax returns',
      description: 'Prepare and submit tax documents',
      isDone: false,
      label: { labelId: 7, name: 'Finance', color: '#FF4500' },
      dueDate: new Date('2025-04-01'),
    },
  ],

  filterTasks: () => {
    const { mockTasks, query } = get();
    if (query.length > 1) {
      const filteredTasks = mockTasks.filter((task) =>
        task.title.toLowerCase().includes(query.toLowerCase())
      );
      set({ filteredTasks: filteredTasks });
      return filteredTasks;
    }
    return [];
  },

  selectTasks: (taskId: number) => {
    const { filteredTasks } = get();
    set({ filteredTasks: filteredTasks.filter((task) => task.id === taskId) });
  },
}));
