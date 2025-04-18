import { cn } from '@/lib/utils';
import { LabelDTO } from '@/model/label-dto';
import React from 'react';

export function Categories({ labels }) {
  return (
    <div>
      <ul>
        {labels.map((label: LabelDTO) => (
            <li key={label.name} className={cn('flex items-center ml-2 px-4 py-2 w-full rounded-md')}>
              <span
                className="h-4 w-4 rounded-full mr-3"
                style={{ backgroundColor: label.color }}
                aria-hidden="true"
              />
              <span className="text-gray-700">{label.name}</span>
            </li>
        ))}
      </ul>
    </div>
  );
}
