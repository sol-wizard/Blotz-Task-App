'use client';
import { useSearchQuery } from '../../../store/search-task-store';

const SearchTitle = () => {
  //TODO: Move usehook to parent component
  const query = useSearchQuery();

  return (
    <>
      {query.length > 1 ? (
        <p style={{ fontWeight: '2rem', fontSize: '2rem' }}>
          Searching for &quot;{query}&quot;
        </p>
      ) : (
        <p style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>Searching for ...</p>
      )}
    </>
  );
};

export default SearchTitle;
