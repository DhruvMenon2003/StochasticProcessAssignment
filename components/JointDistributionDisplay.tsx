import React from 'react';
import { Distribution } from '../types';

interface JointDistributionDisplayProps {
  distribution: Distribution;
  headers: string[];
}

export const JointDistributionDisplay: React.FC<JointDistributionDisplayProps> = ({ distribution, headers }) => {
  // FIX: Cast probability values to number for sorting, as Object.entries can infer them as `unknown`.
  const sortedEntries = Object.entries(distribution).sort(([, probA], [, probB]) => (probB as number) - (probA as number));

  if (sortedEntries.length === 0) {
    return (
        <p className="text-gray-500 italic px-3 py-2 bg-gray-900/50 rounded-md border border-gray-700">
            The joint distribution is empty, possibly due to sparse data for this model order.
        </p>
    );
  }

  return (
    <div className="bg-gray-800 rounded-md text-sm font-mono max-h-96 overflow-y-auto border border-gray-700">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr className="border-b-2 border-gray-600">
            {headers.map((header, i) => (
              <th key={i} className="p-3 font-semibold text-center">{header}</th>
            ))}
            <th className="p-3 font-semibold text-center border-l-2 border-gray-600">Probability</th>
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map(([key, prob]) => {
            const states = key.split('|');
            return (
              <tr key={key} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                {states.map((state, i) => (
                  <td key={i} className="p-3 text-center">{state}</td>
                ))}
                <td className="p-3 text-center font-bold text-teal-300 border-l-2 border-gray-600">
                  {/* FIX: Cast `prob` to number to use `toExponential`, as it can be inferred as `unknown`. */}
                  {(prob as number).toExponential(4)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
