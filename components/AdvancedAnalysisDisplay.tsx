import React from 'react';
import { AnalysisResult } from '../services/stochasticService';

export const AdvancedAnalysisDisplay: React.FC<{ results: AnalysisResult }> = ({ results }) => {

  const { timeHomogeneityTest, markovOrderTest } = results;

  if (!timeHomogeneityTest && !markovOrderTest) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {timeHomogeneityTest && (
          <div>
            <h4 className="font-semibold text-lg text-gray-300 mb-3">Time Homogeneity</h4>
            <div className="space-y-2 text-sm">
                {Object.entries(timeHomogeneityTest).map(([variable, result]) => (
                    <div key={variable} className="flex justify-between items-center bg-gray-800 p-2 rounded-md">
                        <span className="font-mono text-gray-400">{variable}:</span>
                        <span className={`font-semibold px-2 py-1 rounded-full text-xs ${result.isHomogeneous ? 'bg-green-800/70 text-green-300' : 'bg-yellow-800/70 text-yellow-300'}`}>
                            {result.isHomogeneous ? 'Homogeneous' : 'Non-Homogeneous'}
                        </span>
                    </div>
                ))}
            </div>
          </div>
        )}

        {markovOrderTest && (
          <div>
            <h4 className="font-semibold text-lg text-gray-300 mb-3">Self-Dependence (1st Order)</h4>
            <div className="space-y-2 text-sm">
                {Object.entries(markovOrderTest).map(([variable, results]) => (
                    results.map(result => (
                        <div key={`${variable}-${result.order}`} className="flex justify-between items-center bg-gray-800 p-2 rounded-md">
                            <span className="font-mono text-gray-400">{variable}:</span>
                            <span className={`font-semibold px-2 py-1 rounded-full text-xs ${result.isMarkovian ? 'bg-blue-800/70 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
                                {result.isMarkovian ? 'Has Memory' : 'Memoryless'}
                            </span>
                        </div>
                    ))
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
