import Image from 'next/image';
import {H3} from '@/components/ui/heading-with-anchor';

const DisplayNoTask = () => {
  return (
    <div className="relative w-full h-[80%] flex flex-col items-center justify-center gap-3">
      <div className="relative w-full h-[6rem]">
        <Image 
          src="/assets/images/no-task-placeholder.png" 
          alt="A placeholder image when theres no task for today"
          fill
          className="object-contain"
        />
      </div>
      <H3>Currently No Task</H3>
      <span className="text-gray-400 font-medium">Click the &quot;+&quot; button to add a task</span>
    </div>
  )
}

export default DisplayNoTask;