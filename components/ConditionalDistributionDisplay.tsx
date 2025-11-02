import React from 'react';
import { ConditionalDistributionTable } from '../types';

interface ConditionalDistributionDisplayProps {
  distribution: ConditionalDistributionTable;
}

export const ConditionalDistributionDisplay: React.FC<ConditionalDistributionDisplayProps> = ({ distribution }) => {
  const { targetVariable, conditionedVariable, targetStates, conditionedStates, matrix } = distribution;
  return (
    <div>
      <h4 className="font-semibold text-lg text-gray-300 mb-2">
        Conditional Distribution P({targetVariable} | {conditionedVariable})
      </h4>
      <p className="text-sm text-gray-400 mb-3">
        Probability P({targetVariable}=j | {conditionedVariable}=i)
      </p>
      <div className="bg-gray-800 rounded-md text-sm font-mono max-h-80 overflow-auto border border-gray-700">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-600">
              <th className="p-3 font-semibold">{conditionedVariable} \ {targetVariable}</th>
              {targetStates.map((s, i) => (
                <th key={i} className="p-3 font-semibold text-center">{String(s)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                <th className="p-3 font-semibold bg-gray-800 sticky left-0">{String(conditionedStates[i])}</th>
                {row.map((prob, j) => (
                  <td key={j} className="p-3 text-center">
                    {prob.toFixed(3)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
