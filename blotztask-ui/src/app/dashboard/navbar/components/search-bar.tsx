import { Command, CommandInput } from '@/components/ui/command';
import useClickOutside from '@/utils/use-multiple-click-away';
import { CommandEmpty, CommandItem, CommandList } from 'cmdk';
import { useRef } from 'react';
import { useSearchTaskStore } from '../../store/search-task-store';

const SearchBar = () => {
  const { query, setQuery, filteredTasks, searchPageRef, filterTasks, selectTasks } = useSearchTaskStore();

  const commandRef = useRef<HTMLDivElement>(null);

  useClickOutside([commandRef, searchPageRef], () => {
    setQuery('');
  });

  return (
    <Command
      className={`rounded-xl mt-4 max-h-60 border ${query ? 'border-gray-300' : 'border-transparent'}`}
      ref={commandRef}
    >
      <CommandInput
        placeholder="Search a task..."
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          filterTasks();
        }}
      />
      <CommandList>
        {query.length > 1 && <CommandEmpty className="mx-20 my-5">No result found.</CommandEmpty>}

        {filteredTasks &&
          filteredTasks.map((task) => (
            <CommandItem
              onSelect={() => selectTasks(task.id)}
              key={task.id}
              className="pl-5 py-3 text-gray-600 hover:bg-blue-500 hover:text-white rounded-lg"
            >
              {task.title}
            </CommandItem>
          ))}
      </CommandList>
    </Command>
  );
};

export default SearchBar;
