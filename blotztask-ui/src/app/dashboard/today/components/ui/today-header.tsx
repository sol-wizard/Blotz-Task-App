import { H1 } from '@/components/ui/heading-with-anchor';
import React from 'react';
import { format } from 'date-fns';

const TodayHeader = () => {
  const todayDate = format(new Date(), 'EEEE, d MMMM');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between item-start">
        <div className="flex items-center gap-2">
          <H1 className="text-primary-dark text-5xl font-bold">Today</H1>
          <span className="text-lg text-gray-800 mt-8">{todayDate}</span>
        </div>
      </div>
    </div>
  );
};

export default TodayHeader;
