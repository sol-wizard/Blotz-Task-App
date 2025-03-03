import { cn } from '@/lib/utils';

const LoadingSpinner = ({ variant, className }: { variant?: string; className?: string }) => {
  return (
    <div
      className={cn(
        'w-[1em] h-[1em] rounded-full',
        variant === 'blue' ? 'animate-mul-shd-spin' : 'animate-mul-shd-spin-white',
        className
      )}
    ></div>
  );
};

export default LoadingSpinner;
