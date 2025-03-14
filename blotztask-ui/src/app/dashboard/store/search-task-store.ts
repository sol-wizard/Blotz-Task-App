import { create } from 'zustand';

type SearchTaskStore = {
  query: string;
  setQuery: (query: string) => void;
};

export const useSearchTaskStore = create<SearchTaskStore>((set, get) => ({
  query: '',
  setQuery: (query) => set({ query }),
}));
