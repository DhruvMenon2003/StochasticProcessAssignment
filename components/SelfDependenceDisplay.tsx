import React from 'react';
import { SelfDependenceAnalysis } from '../types';
import { InfoIcon } from './icons/InfoIcon';

interface SelfDependenceDisplayProps {
  analysis: SelfDependenceAnalysis;
}

export const SelfDependenceDisplay: React.FC<SelfDependenceDisplayProps> = ({ analysis }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700 space-y-6">
        <div>
            <h4 className="font-semibold text-lg text-gray-200 mb-3">Self-Dependence Order Analysis</h4>
            <p className="text-sm text-gray-400 mb-4">
                This analysis determines the 'memory' of the process by comparing models of different orders. A k-th order model assumes the state at any time depends only on the previous `k` states. We compare the marginal distributions derived from each model to the empirical ('Full Past') model. The best order is where the distance metric is minimized or stops improving significantly.
            </p>
        </div>
        <div className="bg-gray-800 rounded-md text-sm font-mono overflow-x-auto border border-gray-700">
            <table className="w-full text-left">
                <thead className="bg-gray-800 z-10">
                    <tr className="border-b border-gray-600">
                        <th className="p-3 font-semibold text-gray-300">Order (k)</th>
                        <th className="p-3 font-semibold text-gray-300 text-center">Avg. Hellinger Distance</th>
                        <th className="p-3 font-semibold text-gray-300 text-center">Avg. KL Divergence</th>
                    </tr>
                </thead>
                <tbody>
                    {analysis.orders.map(result => (
                        <tr key={result.order} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors">
                            <td className="p-3 font-semibold text-gray-400">
                                {result.order} {result.order === 1 && '(Markovian)'}
                            </td>
                            <td className="p-3 text-center text-teal-300">{result.avgHellinger.toFixed(5)}</td>
                            <td className="p-3 text-center text-blue-300">
                                {isFinite(result.avgKlDivergence) ? result.avgKlDivergence.toFixed(5) : 'Infinity'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="text-xs text-gray-500 p-2 text-right">
                Distances are relative to the full past (empirical) model. Lower is better.
            </div>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h5 className="font-semibold text-gray-200 mb-2 flex items-center">
                <InfoIcon className="w-5 h-5 mr-2 text-blue-400" />
                Conclusion
            </h5>
            <p className="text-gray-300" dangerouslySetInnerHTML={{ __html: analysis.conclusion }}></p>
        </div>
    </div>
  );
};
