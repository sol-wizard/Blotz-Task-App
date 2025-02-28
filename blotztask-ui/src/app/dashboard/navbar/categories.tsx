import React from "react";
import { useEffect, useState } from 'react';
import { LabelDTO } from '@/model/label-dto';
import { fetchAllLabel } from '@/services/labelService';

export function Categories() {
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
    <div>
      <ul className="space-y-2">
        {labels.map((label) => (
          <li key={label.name} className="flex items-center space-x-2">
            <span
              className={'h-4 w-4 rounded-full '}
              style={{ backgroundColor: label.color }}
              aria-hidden="true"
            ></span>
            <span className="text-gray-700">{label.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
