import React from 'react';
import { AnalysisResult } from '../services/stochasticService';
import { SingleVariableComparisonTable } from './SingleVariableComparisonTable';
import { DistributionDetailCard } from './DistributionDetailCard';

interface SingleVariableDisplayProps {
  results: AnalysisResult;
  explanation: string | null;
}

export const SingleVariableDisplay: React.FC<SingleVariableDisplayProps> = ({ results, explanation }) => {
  const variableName = results.headers[0];
  
  return (
    <div className="space-y-12">
      <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
          Analysis Summary (Single Variable: {variableName})
        </h2>
        {explanation ? (
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{explanation}</p>
        ) : (
          <p className="text-gray-400">Generating expert summary...</p>
        )}
      </div>

      {results.modelResults && results.modelResults.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">Model Fit Comparison</h3>
          <SingleVariableComparisonTable modelResults={results.modelResults} bestModelName={results.bestModelName} />
        </div>
      )}

      <div>
        <h3 className="text-2xl font-bold text-gray-100 mb-4">Distribution Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DistributionDetailCard 
            title="Empirical Data"
            distribution={results.empirical.marginals[variableName]}
            cmf={results.empirical.cmf}
            moments={results.empirical.moments ? results.empirical.moments[variableName] : undefined}
          />
          {results.modelResults?.map(modelResult => (
            <DistributionDetailCard
              key={modelResult.name}
              title={`Model: ${modelResult.name}`}
              distribution={modelResult.distributions.marginals[variableName]}
              cmf={modelResult.distributions.cmf}
              moments={modelResult.distributions.moments ? modelResult.distributions.moments[variableName] : undefined}
              isBest={modelResult.name === results.bestModelName}
            />
          ))}
        </div>
      </div>
    </div>
  );
};