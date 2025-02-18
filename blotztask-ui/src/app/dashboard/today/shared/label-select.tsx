import * as React from 'react';

import {
  LabelSelectItem,
  Select,
  SelectContent,
  SelectGroup,
  SelectLabelTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tag } from 'lucide-react';
import { LabelDTO } from '@/model/label-dto';
import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { TaskDetailDTO } from '../../task-list/models/task-detail-dto';

export function LabelSelect({
  task,
  control,
  labelPickerRef,
}: {
  task: TaskDetailDTO;
  control: Control;
  labelPickerRef?: React.RefObject<HTMLDivElement>;
}) {
  const labels: LabelDTO[] = [
    { id: 7, name: 'Personal', color: 'bg-amber-400' },
    { id: 8, name: 'Academic', color: 'bg-rose-500' },
    { id: 9, name: 'Others', color: 'bg-cyan-300' },
    { id: 6, name: 'Work', color: 'bg-blue-700' },
  ];

  return (
    <FormField
      control={control}
      name="labelId"
      render={({ field }) => (
        <FormItem>
          <Select onValueChange={(value) => field.onChange(Number(value))}>
            <FormControl>
              <SelectLabelTrigger
                className={`flex flex-row w-30 items-center rounded-full px-3 py-1 text-xs`}
              >
                <Tag className="mr-1" size={16} />
                <SelectValue placeholder={task.label.name}>
                  {labels.find((label) => label.id === field.value)?.name || 'Select Label'}
                </SelectValue>
              </SelectLabelTrigger>
            </FormControl>
            <SelectContent ref={labelPickerRef ?? undefined}>
              <SelectGroup>
                {labels.map((label) => (
                  <LabelSelectItem
                    key={label.id}
                    value={label.id.toString()}
                    className="flex flex-row items-center px-2 py-1"
                  >
                    <div className="flex flex-row">{label.name}</div>
                  </LabelSelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
