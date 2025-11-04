import React from 'react';
import { AnalysisResult } from '../services/stochasticService';
import { MetricCard } from './MetricCard';
import { Distribution } from '../types';
import { MarkovDisplay } from './MarkovDisplay';
import { AdvancedAnalysisDisplay } from './AdvancedAnalysisDisplay';
import { ModelComparisonTable } from './ModelComparisonTable';
import { SingleVariableDisplay } from './SingleVariableDisplay';
import { ConditionalDistributionDisplay } from './ConditionalDistributionDisplay';
import { DependenceAnalysisDisplay } from './DependenceAnalysisDisplay';
import { ConditionalMomentsDisplay } from './ConditionalMomentsDisplay';

interface ResultsDisplayProps {
  results: AnalysisResult;
  explanation: string | null;
}

const JointDistributionTable: React.FC<{ dist: Distribution; title: string; headers: string[] }> = ({ dist, title, headers }) => {
  const sortedEntries = Object.entries(dist).sort(([keyA], [keyB]) => keyA.localeCompare(keyB, undefined, { numeric: true }));

  return (
      <div className="relative">
          <h4 className="font-semibold text-lg text-gray-300 mb-2">{title}</h4>
          <div className="bg-gray-800 rounded-md text-sm font-mono max-h-72 overflow-y-auto border border-gray-700">
              <table className="w-full text-left">
                  <thead className="sticky top-0 bg-gray-800 z-10">
                      <tr className="border-b border-gray-600">
                          {headers.map(h => <th key={h} className="p-3 font-semibold">{h}</th>)}
                          <th className="p-3 font-semibold">P({headers.join(', ')})</th>
                      </tr>
                  </thead>
                  <tbody>
                      {sortedEntries.map(([key, value]) => {
                          const states = key.split('|');
                          return (
                              <tr key={key} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors">
                                  {states.map((s, i) => <td key={i} className="p-3">{s}</td>)}
                                  {/* FIX: Cast `value` to number to use `toFixed`, as it can be inferred as `unknown`. */}
                                  <td className="p-3">{(value as number).toFixed(4)}</td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  );
};

const MarginalDistributionDisplay: React.FC<{ dist: Distribution; title: string; }> = ({ dist, title }) => {
  return (
      <div>
          <h4 className="font-semibold text-lg text-gray-300 mb-2">{title}</h4>
          <div className="bg-gray-800 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-gray-700">
              {Object.entries(dist)
                  .sort(([keyA], [keyB]) => keyA.localeCompare(keyB, undefined, { numeric: true }))
                  // FIX: Cast `value` to number to use `toFixed`, as it can be inferred as `unknown`.
                  .map(([key, value]) => `${key}: ${(value as number).toFixed(4)}`)
                  .join('\n')}
          </div>
      </div>
  );
};


export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, explanation }) => {
  if (results.isSingleVariable) {
    return <SingleVariableDisplay results={results} explanation={explanation} />;
  }
  
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
           <h3 className="text-2xl font-bold text-gray-100 mb-4">Model Fit Evaluation</h3>
           <ModelComparisonTable modelResults={results.modelResults} bestModelName={results.bestModelName} />
        </div>
      )}

      {results.dependenceAnalysis && results.dependenceAnalysis.length > 0 && (
        <div>
           <h3 className="text-2xl font-bold text-gray-100 mb-4">Stochastic Dependence Evaluation</h3>
            <DependenceAnalysisDisplay analysis={results.dependenceAnalysis} />
        </div>
      )}
      
      {(results.timeHomogeneityTest || results.markovOrderTest) && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">Advanced Analysis</h3>
          <AdvancedAnalysisDisplay results={results} />
        </div>
      )}

      <div>
        <h3 className="text-2xl font-bold text-gray-100 mb-4">Empirical Distributions</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {results.empirical.joint && <JointDistributionTable dist={results.empirical.joint} title="Empirical Joint PMF" headers={results.headers} />}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
           {results.headers.map(header => (
            <React.Fragment key={`${header}-emp`}>
              {results.empirical.marginals[header] && <MarginalDistributionDisplay dist={results.empirical.marginals[header]} title={`Empirical (${header})`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {results.empirical.conditionals && results.empirical.conditionals.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">Empirical Conditional Distributions</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {results.empirical.conditionals.map((dist, index) => (
              <ConditionalDistributionDisplay key={index} distribution={dist} />
            ))}
          </div>
        </div>
      )}

      {results.empirical.conditionalMoments && results.empirical.conditionalMoments.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 my-4">Empirical Conditional Moments</h3>
           <p className="text-gray-400 mb-4 text-sm -mt-2">
            Conditional expectation and variance. These are only calculated for pairs where the target variable is numeric.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {results.empirical.conditionalMoments.map((dist, index) => (
              <ConditionalMomentsDisplay key={index} distribution={dist} />
            ))}
          </div>
        </div>
      )}

      {results.modelResults?.map(modelResult => (
         <div key={modelResult.name}>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">Model Distributions: <span className="text-teal-300">{modelResult.name}</span></h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {modelResult.distributions.joint && <JointDistributionTable dist={modelResult.distributions.joint} title="Model Joint PMF" headers={results.headers} />}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            {results.headers.map(header => (
              <React.Fragment key={`${header}-${modelResult.name}`}>
                {modelResult.distributions.marginals[header] && <MarginalDistributionDisplay dist={modelResult.distributions.marginals[header]} title={`Model (${header})`} />}
              </React.Fragment>
            ))}
          </div>
           {modelResult.distributions.conditionals && modelResult.distributions.conditionals.length > 0 && (
              <div className="mt-8">
                <h4 className="text-xl font-bold text-gray-200 mb-4">Model Conditional Distributions</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {modelResult.distributions.conditionals.map((dist, index) => (
                    <ConditionalDistributionDisplay key={index} distribution={dist} />
                  ))}
                </div>
              </div>
            )}
           {modelResult.distributions.conditionalMoments && modelResult.distributions.conditionalMoments.length > 0 && (
              <div className="mt-8">
                <h4 className="text-xl font-bold text-gray-200 mb-4">Model Conditional Moments</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {modelResult.distributions.conditionalMoments.map((dist, index) => (
                    <ConditionalMomentsDisplay key={index} distribution={dist} />
                  ))}
                </div>
              </div>
            )}
        </div>
      ))}
     

      {results.markov && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">First-Order Markov Chain Analysis</h3>
          <MarkovDisplay results={results.markov} />
        </div>
      )}
      
    </div>
  );
};