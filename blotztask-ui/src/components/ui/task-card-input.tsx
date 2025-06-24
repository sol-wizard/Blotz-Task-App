import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const TaskCardInput = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full bg-transparent px-3 py-1 text-sm text-[#444964] font-sans transition-colors placeholder:text-[#444964] disabled:cursor-not-allowed disabled:opacity-50 focus:ring-0 focus:outline-none',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

TaskCardInput.displayName = 'TaskCardInput';

export { TaskCardInput as Input };
