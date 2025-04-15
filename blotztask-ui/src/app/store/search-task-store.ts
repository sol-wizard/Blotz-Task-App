import { create } from 'zustand';
import { TaskDetailDTO } from '../../model/task-detail-dto';
import {
  deleteTask,
  editTask,
  fetchSearchedTasks,
  undoDeleteTask,
  updateTaskStatus,
} from '@/services/task-service';
import { RawAddTaskDTO } from '@/model/raw-add-task-dto';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { performTaskAndRefresh } from './today-store/util';

type SearchTaskStore = {
  filterTasks: () => Promise<void>;
  filteredTasks: TaskDetailDTO[];
  searchTaskIsLoading: boolean;
  query: string;
  setQuery: (query: string) => void;

  actions: {
    loadSearchTasks: () => Promise<void>;
    setLoading: (value: boolean) => void;
    handleEditTask: (updatedTask: RawEditTaskDTO) => void;
    handleDeleteTask: (taskId: number) => void;
    handleTaskDeleteUndo: (taskId: number) => void;
    handleCheckboxChange: (taskId: number) => void;
  };
};

const useSearchTaskStore = create<SearchTaskStore>((set, get) => ({
  query: '',
  setQuery: (query) => set({ query }),

  filteredTasks: [],

  filterTasks: async () => {
    const { query } = get();
    if (query.length > 1) {
      try {
        const searchedResults = await fetchSearchedTasks(query);
        set({ filteredTasks: searchedResults });
      } catch (error) {
        console.log('Error searching tasks: ', error);
      }
    }
  },

  searchTaskIsLoading: false,

  actions: {
    setLoading: (value) => set({ searchTaskIsLoading: value }),

    loadSearchTasks: async () => {
      const { setLoading } = get().actions;
      const { filterTasks } = get();
      await performTaskAndRefresh(
        () => filterTasks(),
        async () => {}, // no-op reload since it's already loading
        setLoading
      );
    },

    handleEditTask: async (updatedTask: RawEditTaskDTO) => {
      const { loadSearchTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => editTask(updatedTask), loadSearchTasks, setLoading);
    },

    handleDeleteTask: async (taskId: number) => {
      const { loadSearchTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => deleteTask(taskId), loadSearchTasks, setLoading);
    },

    handleTaskDeleteUndo: async (taskId: number) => {
      const { loadSearchTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => undoDeleteTask(taskId), loadSearchTasks, setLoading);
    },

    handleCheckboxChange: async (taskId: number) => {
      const { loadSearchTasks, setLoading } = get().actions;
      await performTaskAndRefresh(() => updateTaskStatus(taskId), loadSearchTasks, setLoading);
    },
  },
}));

export const useSetQuery = () => useSearchTaskStore((state) => state.setQuery);
export const useQuery = () => useSearchTaskStore((state) => state.query);
export const useFilteredTasks = () => useSearchTaskStore((state) => state.filteredTasks);
export const useSearchTaskActions = () => useSearchTaskStore((state) => state.actions);
