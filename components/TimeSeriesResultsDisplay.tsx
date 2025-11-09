
import React from 'react';
import { AnalysisResult } from '../types';
import { ModelComparisonTable } from './ModelComparisonTable';
import { MomentsDisplay } from './MomentsDisplay';
import { MarkovDisplay } from './MarkovDisplay';
import { AdvancedAnalysisDisplay } from './AdvancedAnalysisDisplay';

interface TimeSeriesResultsDisplayProps {
  results: AnalysisResult;
  explanation: string | null;
}

export const TimeSeriesResultsDisplay: React.FC<TimeSeriesResultsDisplayProps> = ({ results, explanation }) => {

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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <MomentsDisplay title="Empirical Moments" moments={results.empirical.moments} />
            {results.bestModelName && results.modelResults.find(m => m.name === results.bestModelName) &&
                <MomentsDisplay 
                    title={`Best Model Moments (${results.bestModelName})`} 
                    moments={results.modelResults.find(m => m.name === results.bestModelName)!.distributions!.moments} 
                />
            }
          </div>

        </div>
      )}

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