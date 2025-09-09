'use client';

import React from 'react';

export const EnvironmentIndicator = () => {
  return (
    <div
      className={`text-lg rounded-md px-3 py-4 mt-1 mx-16 font-bold flex items-center justify-center space-x-4 border bg-gray-100 text-gray-800 border-gray-200`}
    >
      <span className="font-bold uppercase py-1 px-3 rounded-full text-xs bg-white">
        <p>We are migrating to a new mobile app! During this transition, our current web app may experience some issues. Once the migration is complete, the web app will be replaced with a simple static website. Thank you for your patience and support as we work on improving your experience.</p>
      </span>
    </div>
  );
}; 