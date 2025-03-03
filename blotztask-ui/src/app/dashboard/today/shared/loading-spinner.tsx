import { cn } from '@/lib/utils';

const LoadingSpinner = ({ variant, className }: { variant?: string; className?: string }) => {
  return (
    <div
      className={cn(
        'mb-12 ml-8 text-[10px] w-[1em] h-[1em] rounded-full',
        variant === 'blue' ? 'animate-mul-shd-spin' : 'animate-mul-shd-spin-white',
        className
      )}
      style={{ textIndent: '-9999em', transform: 'translateZ(0)' }}
    ></div>
  );
};

export default LoadingSpinner;
