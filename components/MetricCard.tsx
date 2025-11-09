
import React from 'react';
import { InfoIcon } from './icons/InfoIcon';

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, description }) => {
  const valueStr = String(value);
  // Adjust font size based on the length of the displayed value for better UI
  const valueFontSize = valueStr.length > 8 ? 'text-2xl' : 'text-4xl';

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg relative group">
      <h3 className="text-lg font-semibold text-gray-400">{title}</h3>
      <p className={`${valueFontSize} font-bold text-teal-300 my-2 break-words`}>{valueStr}</p>
      <div className="absolute top-4 right-4 text-gray-500">
        <InfoIcon className="h-5 w-5" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900 text-gray-300 text-sm rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {description}
      </div>
    </div>
  );
};