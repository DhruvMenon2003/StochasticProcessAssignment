import React from 'react';
import { DependenceAnalysisPair } from '../types';

interface DependenceAnalysisDisplayProps {
    analysis: DependenceAnalysisPair[];
}

const formatValue = (value: number | null) => {
    if (value === null || typeof value === 'undefined') {
        return <span className="text-gray-500">N/A</span>;
    }
    return value.toFixed(5);
};

export const DependenceAnalysisDisplay: React.FC<DependenceAnalysisDisplayProps> = ({ analysis }) => {
    if (!analysis || analysis.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {analysis.map(({ variablePair, empiricalMetrics, modelMetrics }) => (
                <div key={variablePair.join('-')} className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
                    <h4 className="font-semibold text-lg text-gray-300 mb-4">
                        Dependence Analysis: <span className="font-bold text-teal-300">{variablePair[0]}</span> & <span className="font-bold text-teal-300">{variablePair[1]}</span>
                    </h4>
                    <div className="bg-gray-800 rounded-md text-sm font-mono overflow-x-auto border border-gray-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-800 z-10">
                                <tr className="border-b border-gray-600">
                                    <th className="p-3 font-semibold">Metric</th>
                                    <th className="p-3 font-semibold">Empirical Data</th>
                                    {modelMetrics.map(m => <th key={m.modelName} className="p-3 font-semibold">{m.modelName}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors">
                                    <td className="p-3 font-semibold text-gray-400">Mutual Information</td>
                                    <td className="p-3">{formatValue(empiricalMetrics.mutualInformation)}</td>
                                    {modelMetrics.map(m => <td key={m.modelName} className="p-3">{formatValue(m.mutualInformation)}</td>)}
                                </tr>
                                 <tr className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors">
                                    <td className="p-3 font-semibold text-gray-400">Distance Correlation</td>
                                    <td className="p-3">{formatValue(empiricalMetrics.distanceCorrelation)}</td>
                                    {modelMetrics.map(m => <td key={m.modelName} className="p-3">{formatValue(m.distanceCorrelation)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                     <div className="text-xs text-gray-500 p-2 text-right">
                        Higher values indicate stronger dependence. N/A for Distance Correlation on non-numeric data.
                    </div>
                </div>
            ))}
        </div>
    );
};