
import React from 'react';
import { Distribution } from '../types';

interface StationaryDistributionDisplayProps {
  distribution: Distribution;
}

export const StationaryDistributionDisplay: React.FC<StationaryDistributionDisplayProps> = ({ distribution }) => {
  // FIX: Cast values to number for sorting, as Object.entries can infer `unknown`.
  const sortedEntries = Object.entries(distribution).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <div>
      <h4 className="font-semibold text-lg text-gray-300 mb-2">Stationary Distribution</h4>
      <p className="text-sm text-gray-400 mb-3">Long-run probability of being in each state.</p>
      <div className="bg-gray-800 rounded-md text-sm font-mono max-h-80 overflow-y-auto border border-gray-700">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-600">
              <th className="p-3 font-semibold">State</th>
              <th className="p-3 font-semibold text-right">Probability</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map(([state, prob]) => (
              <tr key={state} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                <td className="p-3">{state}</td>
                <td className="p-3 text-right">
                    {/* FIX: Cast `prob` to number to use `toFixed`, as it can be inferred as `unknown`. */}
                    {(prob as number).toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};