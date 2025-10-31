import React from 'react';
import { AnalysisResult } from '../services/stochasticService';
import { MetricCard } from './MetricCard';
import { Distribution } from '../types';
import { MarkovDisplay } from './MarkovDisplay';
import { AdvancedAnalysisDisplay } from './AdvancedAnalysisDisplay';
import { ModelComparisonTable } from './ModelComparisonTable';
import { SingleVariableDisplay } from './SingleVariableDisplay';

interface ResultsDisplayProps {
  results: AnalysisResult;
  explanation: string | null;
}

const JointDistributionTable: React.FC<{ dist: Distribution; title: string; headers: string[] }> = ({ dist, title, headers }) => {
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
                      {Object.entries(dist).map(([key, value]) => {
                          const states = key.split('|');
                          return (
                              <tr key={key} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors">
                                  {states.map((s, i) => <td key={i} className="p-3">{s}</td>)}
                                  <td className="p-3">{value.toFixed(4)}</td>
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
                  .map(([key, value]) => `${key}: ${value.toFixed(4)}`)
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
      
      {(results.timeHomogeneityTest || results.markovOrderTest) && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">Advanced Analysis</h3>
          <AdvancedAnalysisDisplay results={results} />
        </div>
      )}

      {results.dependence && results.dependence.mutualInformation !== null && (
        <div>
           <h3 className="text-2xl font-bold text-gray-100 mb-4">Dependence & Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Mutual Information" value={results.dependence.mutualInformation.toFixed(5)} description="Measures the mutual dependence between the two variables. 0 implies independence; higher values mean stronger dependence." />
            </div>
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