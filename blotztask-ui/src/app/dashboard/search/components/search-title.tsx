'use client';
import { useSearchQuery } from '../../../store/search-task-store';

const SearchTitle = () => {
  //TODO: Move usehook to parent component
  const query = useSearchQuery();

  return <>{query.length > 1 ? <p>Searching for &quot;{query}&quot;</p> : <p>Searching for ...</p>}</>;
};

export default SearchTitle;
