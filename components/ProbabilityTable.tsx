
import React from 'react';
import { VariableDef } from '../types';
import { cartesianProduct } from '../utils/mathUtils';

interface ProbabilityTableProps {
  variables: VariableDef[];
  probabilities: Record<string, number>;
  setProbabilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export const ProbabilityTable: React.FC<ProbabilityTableProps> = ({
  variables,
  probabilities,
  setProbabilities
}) => {
  const stateSpaces = variables.map(v => v.states.split(',').map(s => s.trim()).filter(Boolean));
  const allCombinations = cartesianProduct(...stateSpaces);

  const handleProbabilityChange = (key: string, value: string) => {
    const numValue = parseFloat(value);
    setProbabilities(prev => ({
      ...prev,
      [key]: isNaN(numValue) ? 0 : numValue,
    }));
  };
  
  // Fix: Switched from Object.values to Object.keys to prevent type inference issues where probability values were treated as 'unknown'.
  // This resolves errors in both the summation (line 30) and the subsequent .toFixed() call (line 70).
  const totalProbability = Object.keys(probabilities).reduce((sum, key) => sum + (probabilities[key] || 0), 0);

  return (
    <div className="space-y-3">
        <h4 className="font-semibold text-lg text-gray-300">
            {variables.length > 1 ? 'Joint Probability Mass Function' : 'Probability Mass Function'}
        </h4>
        <div className="bg-gray-800 rounded-md text-sm font-mono max-h-96 overflow-y-auto border border-gray-700">
            <table className="w-full text-left">
                <thead className="sticky top-0 bg-gray-800 z-10">
                    <tr className="border-b border-gray-600">
                        {variables.map(v => <th key={v.name} className="p-3 font-semibold">{v.name}</th>)}
                        <th className="p-3 font-semibold">Probability</th>
                    </tr>
                </thead>
                <tbody>
                    {allCombinations.map((combo, index) => {
                        const key = combo.join('|');
                        return (
                            <tr key={key} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors">
                                {combo.map((state, i) => <td key={i} className="p-3">{state}</td>)}
                                <td className="p-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="1"
                                      value={probabilities[key] || ''}
                                      onChange={(e) => handleProbabilityChange(key, e.target.value)}
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
        <div className="text-right text-sm text-gray-400 pr-2 pt-1">
            Total Probability: <span className="font-semibold text-gray-200">{totalProbability.toFixed(4)}</span>
        </div>
    </div>
  );
};