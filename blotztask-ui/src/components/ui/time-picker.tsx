'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const times = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

export default function TimePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (time: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex flex-row text-xs font-normal ml-4
                            items-center rounded-full px-3 py-1 h-[1.625rem] 
                            ${open ? 'bg-primary text-white' : 'bg-gray-300 text-neutral-700'}`}
        >
          <Clock className="mr-1" size={16} />
          {selectedTime ? selectedTime : 'Time'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0">
        <Command>
          <CommandGroup>
            {times.map((time) => (
              <CommandItem
                key={time}
                onSelect={() => {
                  setSelectedTime(time);
                  onChange?.(time);
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', selectedTime === time ? 'opacity-100' : 'opacity-0')} />
                {time}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
