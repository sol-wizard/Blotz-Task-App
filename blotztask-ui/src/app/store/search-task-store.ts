import { create } from 'zustand';
import { TaskDetailDTO } from '../../model/task-detail-dto';
import {
  deleteTask,
  editTask,
  fetchSearchedTasks,
  undoDeleteTask,
  updateTaskStatus,
} from '@/services/task-service';
import { RawEditTaskDTO } from '@/model/raw-edit-task-dto';
import { performTaskAndRefresh } from './shared/util';

type SearchTaskStore = {
  filteredTasks: TaskDetailDTO[];
  searchTaskIsLoading: boolean;
  query: string;

  actions: {
    setQuery: (query: string) => void;
    filterTasks: () => Promise<void>;
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

  filteredTasks: [],

  searchTaskIsLoading: false,

  actions: {
    setQuery: (query) => set({ query }),

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

    setLoading: (value) => set({ searchTaskIsLoading: value }),

    loadSearchTasks: async () => {
      const { setLoading } = get().actions;
      const { filterTasks } = get().actions;
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

export const useSearchQuery = () => useSearchTaskStore((state) => state.query);
export const useFilteredTasks = () => useSearchTaskStore((state) => state.filteredTasks);
export const useSearchTaskActions = () => useSearchTaskStore((state) => state.actions);
