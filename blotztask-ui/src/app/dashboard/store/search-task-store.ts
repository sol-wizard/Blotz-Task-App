import { create } from 'zustand';
import { TaskDetailDTO } from '../task-list/models/task-detail-dto';
import { fetchSearchedTasks } from '@/services/task-service';

type SearchTaskStore = {
  query: string;
  setQuery: (query: string) => void;
  filterTasks: () => Promise<void>;
  filteredTasks: TaskDetailDTO[];
};

export const useSearchTaskStore = create<SearchTaskStore>((set, get) => ({
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
}));
