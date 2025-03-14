'use client';
import { useSearchTaskStore } from '../../store/search-task-store';

const SearchTitle = () => {
  const { query } = useSearchTaskStore();

  return query.length > 1 ? <p>Searching for "{query}"</p> : <p>Searching for ...</p>;
};

export default SearchTitle;
