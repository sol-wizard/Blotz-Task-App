'use client';

import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { FormControl, FormField, FormItem } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';
import { TaskDetailDTO } from '@/model/task-detail-dto';
import { Control } from 'react-hook-form';

export function CalendarForm({
  task,
  datePickerRef,
  control,
}: {
  task?: TaskDetailDTO;
  datePickerRef?: React.RefObject<HTMLDivElement>;
  control: Control;
}) {
  const [showCalendar, setShowCalendar] = useState(false);
  const handleCalendarClose = () => setShowCalendar(false);

  return (
    <FormField
      control={control}
      name="date"
      render={({ field }) => {
        return (
          <FormItem className="flex flex-col">
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <button
                    className={`flex flex-row text-xs font-normal
                            items-center mr-4 rounded-full px-3 py-1 h-[1.625rem] 
                            ${showCalendar ? 'bg-primary text-white' : 'bg-gray-300 text-neutral-700'}`}
                    onClick={() => setShowCalendar((prev) => !prev)}
                  >
                    <CalendarDays className="mr-1" size={16} />
                    {field.value ? format(field.value, 'MM/dd') : <span>{format(new Date(), 'MM/dd')}</span>}
                  </button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent
                ref={datePickerRef ?? undefined}
                className="w-auto p-0 pointer-events-auto"
                align="start"
                onCloseAutoFocus={handleCalendarClose}
              >
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  initialFocus
                  defaultMonth={task?.dueDate ? new Date(task.dueDate) : new Date()}
                />
              </PopoverContent>
            </Popover>
          </FormItem>
        );
      }}
    />
  );
}