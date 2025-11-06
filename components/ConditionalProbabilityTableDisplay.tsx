import React from 'react';
import { TimeBasedConditionalDistributionTable } from '../types';

interface ConditionalProbabilityTableDisplayProps {
  table: TimeBasedConditionalDistributionTable;
}

export const ConditionalProbabilityTableDisplay: React.FC<ConditionalProbabilityTableDisplayProps> = ({ table }) => {
  if (!table) return null;

  return (
    <div>
      <h4 className="font-semibold text-lg text-gray-300 mb-2">{table.title}</h4>
      <div className="bg-gray-800 rounded-md text-sm font-mono max-h-96 overflow-auto border border-gray-700">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-600">
                <th colSpan={table.conditionedTimes.length} className="p-3 font-semibold">Conditioned State(s)</th>
                <th colSpan={table.targetStates.length} className="p-3 font-semibold text-center border-l-2 border-gray-600">Target State Probabilities ({table.targetTime})</th>
            </tr>
            <tr className="border-b-2 border-gray-600">
                {table.conditionedTimes.map((time, i) => (
                <th key={i} className="p-3 font-semibold text-center">{time}</th>
                ))}
                {table.targetStates.map((state, i) => (
                <th key={i} className={`p-3 font-semibold text-center ${i === 0 ? 'border-l-2 border-gray-600' : ''}`}>{String(state)}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {table.conditionedStatesCombinations.map((combo, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                {combo.map((state, colIndex) => (
                  <th key={colIndex} className="p-3 font-semibold bg-gray-800 text-center">{String(state)}</th>
                ))}
                {table.matrix[rowIndex].map((prob, colIndex) => (
                  <td key={colIndex} className={`p-3 text-center ${colIndex === 0 ? 'border-l-2 border-gray-600' : ''}`}>{prob.toFixed(3)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
