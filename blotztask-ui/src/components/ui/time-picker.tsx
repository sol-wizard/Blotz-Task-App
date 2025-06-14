'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Clock } from 'lucide-react';
import { FormControl, FormField, FormItem } from '@/components/ui/form';
import { Control } from 'react-hook-form';

const times = ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '9:00 PM', '12:00 AM'];

export default function TimePicker({
  control,
  timePickerRef,
}: {
  control: Control;
  timePickerRef?: React.RefObject<HTMLDivElement>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={control}
      name="time"
      render={({ field }) => {
        return (
          <FormItem>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <div
                    className={`flex flex-row text-xs font-normal ml-4
                            items-center rounded-full px-3 py-1 h-[1.625rem] 
                            ${open ? 'bg-primary text-white' : 'bg-gray-300 text-neutral-700'}`}
                  >
                    <Clock className="mr-1" size={16} />

                    <div className="ml-1">
                      <input
                        className="bg-transparent border-none outline-none placeholder:text-neutral-700 p-0 w-14"
                        value={field.value}
                        placeholder="Add Time"
                        onChange={field.onChange}
                      />
                    </div>
                  </div>
                </FormControl>
              </PopoverTrigger>

              <PopoverContent className="w-24 p-0 pointer-events-auto" ref={timePickerRef ?? undefined}>
                <Command>
                  <CommandGroup>
                    {times.map((time) => (
                      <CommandItem
                        key={time}
                        onSelect={() => {
                          field.onChange(time);
                          setOpen(false);
                        }}
                        className="font-normal text-xs m-0"
                      >
                        {time}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </FormItem>
        );
      }}
    />
  );
}
