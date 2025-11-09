import React from 'react';
import { ModelAnalysisResult } from '../types';
import { CheckIcon } from './icons/CheckIcon';

interface ModelComparisonTableProps {
    modelResults: ModelAnalysisResult[];
    bestModelName?: string;
}

// Define the order of metrics for display
const metricOrder = ['Hellinger Distance', 'Mean Squared Error', 'KL Divergence'];

export const ModelComparisonTable: React.FC<ModelComparisonTableProps> = ({ modelResults, bestModelName }) => {
    if (!modelResults || modelResults.length === 0) {
        return null;
    }
    
    // Filter metrics to only those present in the results and in the desired order
    const availableMetrics = metricOrder.filter(
        metric => modelResults[0]?.comparisonMetrics?.[metric] !== undefined
    );

    return (
        <div className="bg-gray-800 rounded-lg text-sm overflow-x-auto border border-gray-700 shadow-lg">
            <table className="w-full text-left">
                <thead className="bg-gray-900/50 z-10">
                    <tr className="border-b-2 border-gray-600">
                        <th className="p-4 font-semibold text-gray-200">Metric</th>
                        {modelResults.map(res => (
                            <th key={res.name} className={`p-4 font-semibold text-center ${res.name === bestModelName ? 'text-teal-300' : 'text-gray-200'}`}>
                                {res.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="font-mono">
                    {availableMetrics.map(metricKey => (
                        <tr key={metricKey} className="border-b border-gray-700 last:border-b-0">
                            <td className="p-4 font-semibold text-gray-400">{metricKey}</td>
                            {modelResults.map(res => {
                                const metric = res.comparisonMetrics?.[metricKey];
                                const isBestOverall = res.name === bestModelName;
                                return (
                                    <td key={res.name} className={`p-4 text-center ${metric?.isWinner ? 'bg-green-900/40' : ''}`}>
                                        <div className="flex items-center justify-center gap-2">
                                            <span className={`${metric?.isWinner ? 'text-green-300' : 'text-gray-300'}`}>{isFinite(metric?.value ?? NaN) ? metric?.value.toFixed(5) : 'N/A'}</span>
                                            {metric?.isWinner && <CheckIcon className="w-5 h-5 text-green-400" />}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    <tr className="bg-gray-900/50 border-t-2 border-gray-600">
                        <td className="p-4 font-bold text-gray-100">Total Wins</td>
                        {modelResults.map(res => (
                            <td key={res.name} className={`p-4 text-center font-bold text-lg ${res.name === bestModelName ? 'text-teal-300' : 'text-gray-100'}`}>
                                {res.wins ?? 0}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
             <div className="text-xs text-gray-500 p-3 text-right bg-gray-900/50 rounded-b-lg">
                Lower metric value is better. <span className="text-yellow-400">⭐</span> Best Model is one with most wins.
            </div>
        </div>
    );
}