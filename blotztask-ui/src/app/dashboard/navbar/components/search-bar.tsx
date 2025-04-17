import { Command, CommandInput } from '@/components/ui/command';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const SearchBar = ({ query, loadSearchTasks, setQuery }) => {
  const router = useRouter();

  useEffect(() => {
    if (query.length > 0) {
      if (window.location.pathname !== '/dashboard/search') {
        localStorage.setItem('previousPage', window.location.pathname);
      }
      router.push('/dashboard/search');
    } else {
      const prev = localStorage.getItem('previousPage');
      if (prev) {
        router.push(prev);
        localStorage.removeItem('previousPage');
      }
    }
  }, [query]);

  return (
    <Command
      className={`rounded-xl mt-4 max-h-60 border ${query ? 'border-gray-300' : 'border-transparent'}`}
    >
      <CommandInput
        placeholder="Search a task..."
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          loadSearchTasks();
        }}
      />
    </Command>
  );
};

export default SearchBar;
