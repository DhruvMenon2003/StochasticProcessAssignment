
import React from 'react';
import { AdvancedTestResult } from '../types';
import { SelfDependenceChart } from './SelfDependenceChart';

interface AdvancedAnalysisDisplayProps {
  results: AdvancedTestResult;
}

const TestResultCard: React.FC<{ title: string, isSignificant: boolean, pValue: number, details: string }> = ({ title, isSignificant, pValue, details }) => {
    const significanceText = isSignificant ? "Significant (p < 0.05)" : "Not Significant (p >= 0.05)";
    const significanceColor = isSignificant ? "text-yellow-300" : "text-green-300";

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h5 className="font-semibold text-gray-300">{title}</h5>
            <p className="text-sm">
                <span className={significanceColor}>{significanceText}</span>
                <span className="text-gray-400 ml-2">(p-value: {pValue.toFixed(4)})</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">{details}</p>
        </div>
    );
}

export const AdvancedAnalysisDisplay: React.FC<AdvancedAnalysisDisplayProps> = ({ results }) => {
  const markovVars = results.markovOrderTest ? Object.keys(results.markovOrderTest) : [];
  const homogeneityVars = results.timeHomogeneityTest ? Object.keys(results.timeHomogeneityTest) : [];

  return (
    <div className="space-y-8">
      {markovVars.length > 0 && (
        <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
          <h4 className="font-semibold text-lg text-gray-200 mb-3">Self-Dependence Test (1st-order Markov Property)</h4>
          <p className="text-sm text-gray-400 mb-4">
            Tests if a variable's future state depends only on its present state, not its past states. A significant result suggests memory in the process.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markovVars.map(v => {
              const test = results.markovOrderTest![v];
              return <TestResultCard 
                key={v}
                title={v}
                isSignificant={test.pValue < 0.05}
                pValue={test.pValue}
                details={test.details}
              />;
            })}
          </div>
        </div>
      )}
      
      {homogeneityVars.length > 0 && (
         <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700 space-y-6">
          <h4 className="font-semibold text-lg text-gray-200 mb-3">Time Homogeneity Test</h4>
          <p className="text-sm text-gray-400 mb-4">
            Tests if the transition probabilities of the process are stable over time. A significant result suggests the process behavior changes.
          </p>
          {homogeneityVars.map(v => {
              const test = results.timeHomogeneityTest![v];
              return (
                <div key={v} className="space-y-4">
                  <TestResultCard 
                    title={v}
                    isSignificant={test.pValue < 0.05}
                    pValue={test.pValue}
                    details={test.details}
                  />
                  {test.evolution && (
                      <SelfDependenceChart 
                          title={`Evolution of P(Xt = i | Xt-1 = i) for ${v}`}
                          timeSteps={test.evolution.timeSteps}
                          data={test.evolution.data}
                          states={test.evolution.states}
                      />
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
