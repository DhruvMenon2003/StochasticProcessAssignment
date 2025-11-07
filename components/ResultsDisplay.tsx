import React from 'react';
import { AnalysisResult, AnalysisMode } from '../types';
import { SingleVariableDisplay } from './SingleVariableDisplay';
import { TimeSeriesResultsDisplay } from './TimeSeriesResultsDisplay';
import { TimeSeriesEnsembleResultsDisplay } from './TimeSeriesEnsembleResultsDisplay';
import { JointMultivariateResultsDisplay } from './JointMultivariateResultsDisplay';

interface ResultsDisplayProps {
  isLoading: boolean;
  error: string | null;
  results: AnalysisResult | null;
  explanation: string | null;
  mode: AnalysisMode;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ isLoading, error, results, explanation, mode }) => {
  if (isLoading) {
    return (
      <div className="text-center p-10 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-200">Performing Analysis...</h2>
        <p className="text-gray-400">This may take a moment, especially with large datasets or complex models.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/30 rounded-lg border border-red-500">
        <h2 className="text-xl font-semibold text-red-300">Analysis Failed</h2>
        <p className="text-red-400 font-mono mt-2">{error}</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center p-10 bg-gray-800/50 rounded-lg border border-dashed border-gray-600">
        <h2 className="text-xl font-semibold text-gray-400">Ready to Analyze</h2>
        <p className="text-gray-500">Input your data, define any models, and click "Analyze" to see the results here.</p>
      </div>
    );
  }
  
  // New architectural routing logic
  if (results.isEnsemble) {
      return <TimeSeriesEnsembleResultsDisplay results={results} explanation={explanation} />
  }

  if (mode === 'timeSeries') {
      return <TimeSeriesResultsDisplay results={results} explanation={explanation} />
  }

  if (mode === 'joint') {
      if (results.headers.length === 1) {
          return <SingleVariableDisplay results={results} explanation={explanation} />
      } else {
          return <JointMultivariateResultsDisplay results={results} explanation={explanation} />
      }
  }

  // Fallback for any unhandled case
  return (
      <div className="p-6 bg-yellow-900/30 rounded-lg border border-yellow-500">
        <h2 className="text-xl font-semibold text-yellow-300">Display Error</h2>
        <p className="text-yellow-400 font-mono mt-2">Could not determine the correct display format for the analysis mode '{mode}'.</p>
      </div>
  );
};
