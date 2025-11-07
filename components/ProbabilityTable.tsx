import React, { useMemo } from 'react';
import { VariableDef } from '../types';
import { cartesianProduct } from '../utils/mathUtils';

interface ProbabilityTableProps {
  variables: VariableDef[];
  probabilities: Record<string, number>;
  setProbabilities: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
}

export const ProbabilityTable: React.FC<ProbabilityTableProps> = ({ variables, probabilities, setProbabilities }) => {
  const stateSpaces = useMemo(() => {
    return variables.map(v => v.states.split(',').map(s => s.trim()).filter(Boolean));
  }, [variables]);

  if (stateSpaces.some(ss => ss.length === 0)) {
    return <p className="text-sm text-yellow-400">Please define states for all variables.</p>;
  }

  const allCombinations = useMemo(() => cartesianProduct(...stateSpaces), [stateSpaces]);

  const handleProbChange = (key: string, value: string) => {
    const newProb = parseFloat(value);
    setProbabilities(prev => ({
      ...prev,
      [key]: isNaN(newProb) ? 0 : newProb,
    }));
  };

  const totalProb = Object.values(probabilities).reduce((sum, p) => sum + p, 0);

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-md text-sm font-mono max-h-80 overflow-auto border border-gray-700">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-600">
              {variables.map(v => (
                <th key={v.name} className="p-3 font-semibold text-center">{v.name}</th>
              ))}
              <th className="p-3 font-semibold text-center">Probability</th>
            </tr>
          </thead>
          <tbody>
            {allCombinations.map((combo, i) => {
              const key = combo.join('|');
              return (
                <tr key={key} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                  {combo.map((state, j) => (
                    <td key={j} className="p-3 text-center text-gray-400">{String(state)}</td>
                  ))}
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={probabilities[key] || ''}
                      onChange={(e) => handleProbChange(key, e.target.value)}
                      placeholder="0.0"
                      className="w-full p-1 bg-gray-900 text-gray-300 border border-gray-600 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
       <div className="text-right text-sm">
        <span className="font-semibold text-gray-400">Total Probability: </span>
        <span className={`font-bold ${Math.abs(totalProb - 1.0) < 0.0001 ? 'text-green-400' : 'text-red-400'}`}>
          {totalProb.toFixed(4)}
        </span>
      </div>
    </div>
  );
};
