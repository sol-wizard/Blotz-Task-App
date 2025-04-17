import { cn } from '@/lib/utils';
import { LabelDTO } from '@/model/label-dto';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

export function Categories({ labels }) {
  const pathname = usePathname();

  return (
    <div>
      <ul className="space-y-2">
        {labels.map((label: LabelDTO) => {
          const labelUrl = `/dashboard/labels/${label.name.toLowerCase()}`;
          const isActive = pathname === labelUrl;

          return (
            <li key={label.name}>
              <Link
                href={labelUrl}
                className={cn(
                  'flex items-center ml-2 px-4 py-2 w-full rounded-md',
                  isActive ? 'bg-blue-100  hover:bg-blue-200' : 'hover:bg-blue-200'
                )}
              >
                <span
                  className="h-4 w-4 rounded-full mr-3"
                  style={{ backgroundColor: label.color }}
                  aria-hidden="true"
                ></span>
                <span className={isActive ? 'text-primary' : 'text-gray-700'}>{label.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
