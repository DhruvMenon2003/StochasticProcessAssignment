
import React from 'react';
import { AnalysisResult } from '../services/stochasticService';
import { MetricCard } from './MetricCard';
import { Distribution } from '../types';

interface ResultsDisplayProps {
  results: AnalysisResult;
  explanation: string | null;
}

const renderDistribution = (dist: Distribution | undefined, title: string) => {
  if (!dist) return null;
  return (
    <div>
      <h4 className="font-semibold text-lg text-gray-300 mb-2">{title}</h4>
      <div className="bg-gray-800 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
        {Object.entries(dist)
          .map(([key, value]) => `${key}: ${value.toFixed(4)}`)
          .join('\n')}
      </div>
    </div>
  );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, explanation }) => {
  return (
    <div className="space-y-8">
      <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
          Analysis Summary
        </h2>
        {explanation ? (
          <p className="text-gray-300 whitespace-pre-wrap">{explanation}</p>
        ) : (
          <p className="text-gray-400">Generating expert summary...</p>
        )}
      </div>

      {results.modelComparison && (
        <div>
           <h3 className="text-2xl font-bold text-gray-100 mb-4">Model Fit Evaluation</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard title="Hellinger Distance" value={results.modelComparison.hellingerDistance.toFixed(5)} description="Measures similarity between two probability distributions. Closer to 0 is a better fit." />
              <MetricCard title="Mean Squared Error" value={results.modelComparison.meanSquaredError.toFixed(5)} description="Measures the average squared difference between estimated and actual values. Closer to 0 is better." />
           </div>
        </div>
      )}

      <div>
        <h3 className="text-2xl font-bold text-gray-100 mb-4">Empirical vs. Model Distributions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderDistribution(results.empirical.joint, 'Empirical Joint PMF')}
          {results.model && renderDistribution(results.model.joint, 'Model Joint PMF')}
          {renderDistribution(results.empirical.marginals['VarX'], 'Empirical Marginal (VarX)')}
           {results.model && renderDistribution(results.model.marginals['VarX'], 'Model Marginal (VarX)')}
          {renderDistribution(results.empirical.marginals['VarY'], 'Empirical Marginal (VarY)')}
           {results.model && renderDistribution(results.model.marginals['VarY'], 'Model Marginal (VarY)')}
        </div>
      </div>
      
    </div>
  );
};
