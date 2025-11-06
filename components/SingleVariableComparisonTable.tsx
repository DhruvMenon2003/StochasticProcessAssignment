import React from 'react';
// Fix: Correctly import ModelAnalysisResult from types.ts where it is defined.
import { ModelAnalysisResult } from '../types';
import { CheckIcon } from './icons/CheckIcon';

interface SingleVariableComparisonTableProps {
    modelResults: ModelAnalysisResult[];
    bestModelName?: string;
}

const metricLabels: { [key: string]: string } = {
    hellingerDistance: 'Hellinger Distance',
    meanSquaredError: 'Mean Squared Error',
    kullbackLeiblerDivergence: 'KL Divergence'
};

export const SingleVariableComparisonTable: React.FC<SingleVariableComparisonTableProps> = ({ modelResults, bestModelName }) => {
    const metrics = modelResults[0]?.comparisonMetrics ? Object.keys(modelResults[0].comparisonMetrics) : [];

    return (
        <div className="bg-gray-800 rounded-md text-sm overflow-x-auto border border-gray-700">
            <table className="w-full text-left">
                <thead className="bg-gray-800 z-10">
                    <tr className="border-b border-gray-600">
                        <th className="p-3 font-semibold text-gray-300">Metric</th>
                        {modelResults.map(res => (
                            <th key={res.name} className={`p-3 font-semibold text-center ${res.name === bestModelName ? 'text-teal-300' : 'text-gray-300'}`}>
                                {res.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="font-mono">
                    {metrics.map(metricKey => (
                        <tr key={metricKey} className="border-b border-gray-700 last:border-b-0">
                            <td className="p-3 font-semibold text-gray-400">{metricLabels[metricKey]}</td>
                            {modelResults.map(res => {
                                const metric = res.comparisonMetrics?.[metricKey];
                                return (
                                    <td key={res.name} className={`p-3 text-center ${metric?.isWinner ? 'bg-green-900/40' : ''}`}>
                                        <div className="flex items-center justify-center gap-2">
                                            <span>{isFinite(metric?.value ?? NaN) ? metric?.value.toFixed(5) : 'N/A'}</span>
                                            {metric?.isWinner && <CheckIcon className="w-5 h-5 text-green-400" />}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    <tr className="bg-gray-900/50">
                        <td className="p-3 font-bold text-gray-200">Total Wins</td>
                        {modelResults.map(res => (
                            <td key={res.name} className={`p-3 text-center font-bold text-lg ${res.name === bestModelName ? 'text-teal-300' : 'text-gray-200'}`}>
                                {res.wins ?? 0}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
             <div className="text-xs text-gray-500 p-2 text-right">
                Lower metric value is better. ⭐ Best Model is one with most wins.
            </div>
        </div>
    );
};