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

export function LabelSelect({ control, labelPickerRef }: { control: Control; labelPickerRef?: React.RefObject<HTMLDivElement> }) {
  
  const labels: LabelDTO[] = [
    { labelId: 7, name: "Personal", color: "bg-amber-400" },
    { labelId: 8, name: "Academic", color: "bg-rose-500" },
    { labelId: 9, name: "Others", color: "bg-cyan-300" },
    { labelId: 6, name: "Work", color: "bg-blue-700" }
  ];


  return (
    <FormField
      control={control}  
      name="labelId" 
      render={({ field }) => (
        <FormItem>
          <Select
            value={field.value?.toString()}
            onValueChange={(value) => field.onChange(Number(value))}
          >
            <FormControl>
              <SelectLabelTrigger
                className={`flex flex-row w-30 items-center rounded-full px-3 py-1 text-xs`}
              >
                <Tag className="mr-1" size={16} />

                <SelectValue placeholder="Academic">
                  {labels.find((label) => label.id === field.value)?.name || 'Academic'}
                </SelectValue>

              </SelectLabelTrigger>
            </FormControl>
            <SelectContent ref={labelPickerRef ?? undefined}>
              <SelectGroup>
                {labels.map((label) => (
                  <LabelSelectItem
                    key={label.labelId}
                    value={label.labelId.toString()}
                    className="flex flex-row px-3 py-2 rounded-md"
                  >           
                    <div className="flex flex-row items-center">
                      <span className={`w-4 h-4 rounded-full ${label.color} mr-2 flex-shrink-0`} />

                      <div className="flex-1">{label.name}</div>
                  </div>
                   
                  </LabelSelectItem>
                ))}

              </SelectGroup>
            </SelectContent>
          </Select>

          <FormMessage/>
        </FormItem>
      )}
    />
  );
}
