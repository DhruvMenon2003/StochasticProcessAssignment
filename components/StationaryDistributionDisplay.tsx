import React from 'react';
import { Distribution } from '../types';

interface StationaryDistributionDisplayProps {
  distribution: Distribution;
}

export const StationaryDistributionDisplay: React.FC<StationaryDistributionDisplayProps> = ({ distribution }) => {
  const sortedEntries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h4 className="font-semibold text-lg text-gray-300 mb-2">Stationary Distribution</h4>
      <p className="text-sm text-gray-400 mb-3">Long-run probability of being in each state.</p>
      <div className="bg-gray-800 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-80 overflow-y-auto border border-gray-700">
          <div className="space-y-2">
            {sortedEntries.map(([state, prob]) => (
                <div key={state} className="flex justify-between items-center">
                    <span className="text-gray-300">{state}:</span>
                    <span className="font-bold text-teal-300">{prob.toFixed(4)}</span>
                </div>
            ))}
          </div>
      </div>
    </div>
  );
};
