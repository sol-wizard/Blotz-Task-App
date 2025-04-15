'use client';
import { useQuery } from '../../../store/search-task-store';

const SearchTitle = () => {
  const query = useQuery();

  return <>{query.length > 1 ? <p>Searching for &quot;{query}&quot;</p> : <p>Searching for ...</p>}</>;
};

export default SearchTitle;
