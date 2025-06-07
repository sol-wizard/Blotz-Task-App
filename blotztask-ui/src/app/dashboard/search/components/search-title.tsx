'use client';
import { useSearchQuery } from '../../../store/search-task-store';

const SearchTitle = () => {
  //TODO: Move usehook to parent component
  const query = useSearchQuery();

  return (
    <>
      {query.length > 1 ? (
        <p className="text-2xl font-bold">Searching for &quot;{query}&quot;</p>
      ) : (
        <p className="text-xl font-bold">Searching for ...</p>
      )}
    </>
  );
};

export default SearchTitle;
