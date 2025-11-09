

import React from 'react';
import { AnalysisResult } from '../types';
import { ModelComparisonTable } from './ModelComparisonTable';
import { MomentsDisplay } from './MomentsDisplay';
import { MarkovDisplay } from './MarkovDisplay';
import { AdvancedAnalysisDisplay } from './AdvancedAnalysisDisplay';
import { DistributionDetailCard } from './DistributionDetailCard';

interface TimeSeriesResultsDisplayProps {
  results: AnalysisResult;
  explanation: string | null;
}

export const TimeSeriesResultsDisplay: React.FC<TimeSeriesResultsDisplayProps> = ({ results, explanation }) => {
  const variables = results.headers.filter(h => h.toLowerCase() !== 'time');
  return (
    <div className="space-y-12">
      <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
          Analysis Summary
        </h2>
        {explanation ? (
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{explanation}</p>
        ) : (
          <p className="text-gray-400">Generating expert summary...</p>
        )}
      </div>

      {results.modelResults && results.modelResults.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">Model Fit Comparison (Joint Distribution)</h3>
          <ModelComparisonTable modelResults={results.modelResults} bestModelName={results.bestModelName} />
        </div>
      )}

      <div>
        <h3 className="text-2xl font-bold text-gray-100 mt-12 mb-4">Marginal Distribution Details</h3>
        <div className="space-y-8">
            {variables.map(variableName => (
            <div key={variableName}>
                <h4 className="text-xl font-semibold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">{`Variable: ${variableName}`}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DistributionDetailCard 
                    title="Empirical Data"
                    distribution={results.empirical.marginals[variableName]}
                    cmf={results.empirical.cmfs?.[variableName]}
                    moments={results.empirical.moments?.[variableName]}
                />
                {results.modelResults?.map(modelResult => (
                    <DistributionDetailCard
                    key={modelResult.name}
                    title={`Model: ${modelResult.name}`}
                    distribution={modelResult.distributions!.marginals[variableName]}
                    cmf={modelResult.distributions!.cmfs?.[variableName]}
                    moments={modelResult.distributions!.moments?.[variableName]}
                    isBest={modelResult.name === results.bestModelName}
                    />
                ))}
                </div>
            </div>
            ))}
        </div>
      </div>

      {results.markovResults && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">Markov Chain Analysis</h3>
          <MarkovDisplay results={results.markovResults} />
        </div>
      )}

      {results.advancedTests && (
        <div>
           <h3 className="text-2xl font-bold text-gray-100 mb-4">Advanced Diagnostics</h3>
           <AdvancedAnalysisDisplay results={results.advancedTests} />
        </div>
      )}
    </div>
  );
};