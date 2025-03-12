import { Command, CommandInput } from '@/components/ui/command';
import useClickOutside from '@/utils/use-multiple-click-away';
import { CommandEmpty, CommandItem, CommandList } from 'cmdk';
import { useRef, useState } from 'react';
const mockTasks = [
  { id: 1, title: 'Complete Assignment 1', isDone: true },
  { id: 2, title: 'Review Lecture Notes', isDone: false },
  { id: 3, title: 'Attend Study Group', isDone: true },
  { id: 4, title: 'Complete Assignment 2', isDone: true },
];

const filterTasks = (query) => {
  if (query.length > 2) {
    return mockTasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase()));
  }
  return [];
};

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const filteredTasks = filterTasks(query);
  const commandRef = useRef<HTMLDivElement>(null);

  useClickOutside([commandRef], () => {
    setQuery('');
  });

  return (
    <Command
      className={`rounded-xl mt-4 max-h-60 border ${query ? 'border-gray-300' : 'border-transparent'}`}
      ref={commandRef}
    >
      <CommandInput placeholder="Search a task..." value={query} onValueChange={(value) => setQuery(value)} />
      <CommandList>
        {query.length > 1 && <CommandEmpty className="mx-20 my-5">No result found.</CommandEmpty>}

        {filteredTasks &&
          filteredTasks.map((tasks) => (
            <CommandItem
              key={tasks.id}
              className="pl-5 py-3 text-gray-600 hover:bg-blue-500 hover:text-white rounded-lg"
            >
              {tasks.title}
            </CommandItem>
          ))}
      </CommandList>
    </Command>
  );
};

export default SearchBar;
