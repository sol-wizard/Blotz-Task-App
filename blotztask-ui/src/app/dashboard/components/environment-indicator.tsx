'use client';

import React from 'react';
import { AppEnvironment } from '../../../model/constants/environment';

const getEnvDetails = () => {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV;

  if (appEnv === AppEnvironment.Staging) {
    return {
      text: 'Staging Environment',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  }

  if (appEnv === AppEnvironment.Development) {
    return {
      text: 'Local Environment',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
    };
  }

  // For production or any other case, show nothing.
  return null;
};

export const EnvironmentIndicator = () => {
  const details = getEnvDetails();

  if (!details) {
    return null;
  }

  const { text, color } = details;

  return (
    <div
      className={`text-lg rounded-md px-3 py-4 mt-1 mx-16 font-bold flex items-center justify-center space-x-4 border ${color}`}
    >
      <span className="font-bold uppercase py-1 px-3 rounded-full text-xs bg-white">
        {text}
      </span>
    </div>
  );
}; 