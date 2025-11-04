import React from 'react';
import { ConditionalMomentsTable } from '../types';

interface ConditionalMomentsDisplayProps {
  distribution: ConditionalMomentsTable;
}

export const ConditionalMomentsDisplay: React.FC<ConditionalMomentsDisplayProps> = ({ distribution }) => {
  const { targetVariable, conditionedVariable, conditionedStates, expectations, variances } = distribution;

  return (
    <div>
      <h4 className="font-semibold text-lg text-gray-300 mb-2">
        Conditional Moments for <span className="font-bold text-teal-300">{targetVariable}</span> given <span className="font-bold text-teal-300">{conditionedVariable}</span>
      </h4>
      <div className="bg-gray-800 rounded-md text-sm font-mono max-h-80 overflow-auto border border-gray-700">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-600">
              <th className="p-3 font-semibold">{conditionedVariable}</th>
              <th className="p-3 font-semibold text-center">E({targetVariable} | {conditionedVariable})</th>
              <th className="p-3 font-semibold text-center">Var({targetVariable} | {conditionedVariable})</th>
            </tr>
          </thead>
          <tbody>
            {conditionedStates.map((state, i) => (
              <tr key={String(state)} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                <th className="p-3 font-semibold bg-gray-800 sticky left-0">{String(state)}</th>
                <td className="p-3 text-center">
                  {expectations[i].toFixed(4)}
                </td>
                <td className="p-3 text-center">
                  {variances[i].toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
