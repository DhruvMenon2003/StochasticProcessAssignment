import React from 'react';
// Fix: Correctly import ModelAnalysisResult from types.ts where it is defined.
import { ModelAnalysisResult } from '../types';

interface ModelComparisonTableProps {
    modelResults: ModelAnalysisResult[];
    bestModelName?: string;
}

export const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({ modelResults, bestModelName }) => {
    return (
        <div className="bg-gray-800 rounded-md text-sm font-mono overflow-x-auto border border-gray-700">
            <table className="w-full text-left">
                <thead className="bg-gray-800 z-10">
                    <tr className="border-b border-gray-600">
                        <th className="p-3 font-semibold">Model Name</th>
                        <th className="p-3 font-semibold">Hellinger Dist.</th>
                        <th className="p-3 font-semibold">MSE</th>
                        <th className="p-3 font-semibold">KL Divergence</th>
                        <th className="p-3 font-semibold">Composite Score</th>
                    </tr>
                </thead>
                <tbody>
                    {modelResults.map(result => (
                        <tr 
                            key={result.name} 
                            className={`border-b border-gray-700 last:border-b-0 transition-colors ${
                                result.name === bestModelName 
                                ? 'bg-teal-900/40 hover:bg-teal-900/60' 
                                : 'hover:bg-gray-700/50'
                            }`}
                        >
                            <td className={`p-3 font-semibold ${result.name === bestModelName ? 'text-teal-300' : 'text-gray-300'}`}>
                                {result.name} {result.name === bestModelName && '⭐'}
                            </td>
                            <td className="p-3">{result.comparison.hellingerDistance.toFixed(5)}</td>
                            <td className="p-3">{result.comparison.meanSquaredError.toFixed(5)}</td>
                            <td className="p-3">{isFinite(result.comparison.kullbackLeiblerDivergence) ? result.comparison.kullbackLeiblerDivergence.toFixed(5) : '∞'}</td>
                            <td className="p-3 font-bold">{result.comparison.score?.toFixed(5) ?? 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
             <div className="text-xs text-gray-500 p-2 text-right">
                Lower score is better. ⭐ Best Model.
            </div>
        </div>
    );
}