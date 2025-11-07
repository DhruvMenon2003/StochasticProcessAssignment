import React from 'react';
import { JointDistribution } from '../types';

interface JointDistributionDisplayProps {
  distribution: JointDistribution;
  headers: (string|number)[];
}

export const JointDistributionDisplay: React.FC<JointDistributionDisplayProps> = ({ distribution, headers }) => {
  const sortedEntries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-gray-800 rounded-md text-sm font-mono max-h-96 overflow-auto border border-gray-700">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-gray-800 z-10">
          <tr className="border-b border-gray-600">
            {headers.map((h, i) => (
              <th key={i} className="p-3 font-semibold text-center">{String(h)}</th>
            ))}
            <th className="p-3 font-semibold text-center">Probability</th>
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map(([sequence, probability]) => {
            const states = sequence.split('|');
            return (
              <tr key={sequence} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                {states.map((state, i) => (
                  <td key={i} className="p-3 text-center">{state}</td>
                ))}
                <td className="p-3 text-center font-bold text-teal-300">{probability.toFixed(5)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
