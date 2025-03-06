import React from "react";

export function Categories({ labels }) {
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
