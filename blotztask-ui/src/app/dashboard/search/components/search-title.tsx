'use client';
import { useSearchQuery } from '../../../store/search-task-store';

const SearchTitle = () => {
  //TODO: Move usehook to parent component
  const query = useSearchQuery();

  return (
    <>
      {query.length > 0 ? (
        <h2 className="mt-3 text-2xl font-semibold text-gray-600 mb-8 pl-5">
          Searching for “{query}”
        </h2>
      ) : (
        <h2 className="text-2xl font-semibold text-gray-400 mb-4">
          Searching for ...
        </h2>
      )}
    </>
  );
};

export default SearchTitle;

// test

