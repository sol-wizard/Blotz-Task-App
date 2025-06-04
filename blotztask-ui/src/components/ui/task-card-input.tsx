import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const TaskCardInput = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
TaskCardInput.displayName = 'TaskCardInput';

export { TaskCardInput as Input };
