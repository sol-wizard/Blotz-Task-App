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

import { useEffect, useState } from 'react';
import { fetchAllLabel } from '@/services/labelService';

export function LabelSelect({
  control,
  labelPickerRef,
}: {
  control: Control;
  labelPickerRef?: React.RefObject<HTMLDivElement>;
}) {
  const [labels, setLabels] = useState<LabelDTO[]>([]);

  const loadAllLabel = async () => {
    try {
      const labelData = await fetchAllLabel();
      setLabels(labelData);
    } catch (error) {
      console.error('Error loading labels:', error);
    }
  };

  useEffect(() => {
    loadAllLabel();
  }, []);

  return (
    <FormField
      control={control}
      name="labelId"
      render={({ field }) => (
        <FormItem>
          <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(Number(value))}>
            <FormControl>
              <SelectLabelTrigger
                className={`flex flex-row w-30 items-center rounded-full px-3 py-1 text-xs`}
              >
                <Tag className="mr-1" size={16} />
                <SelectValue placeholder="Select Label" />
              </SelectLabelTrigger>
            </FormControl>
            <SelectContent ref={labelPickerRef ?? undefined}>
              <SelectGroup>
                {labels.map((label) => (
                  <LabelSelectItem
                    key={label.labelId}
                    value={label.labelId.toString()}
                    className="flex flex-row items-center px-2 py-1"
                  >
                    {label.name}
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
