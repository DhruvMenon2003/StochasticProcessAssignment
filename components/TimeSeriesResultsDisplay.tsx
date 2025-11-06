import React from 'react';
import { TimeSeriesEnsembleAnalysis } from '../types';
import { AdvancedAnalysisDisplay } from './AdvancedAnalysisDisplay';
import { SelfDependenceChart } from './SelfDependenceChart';
import { ChartLineIcon } from './icons/ChartLineIcon';

interface TimeSeriesResultsDisplayProps {
  results: TimeSeriesEnsembleAnalysis;
  explanation: string | null;
}

export const TimeSeriesResultsDisplay: React.FC<TimeSeriesResultsDisplayProps> = ({ results, explanation }) => {
  return (
    <div className="space-y-12">
      <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
          Time-Series Ensemble Analysis Summary
        </h2>
        {explanation ? (
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{explanation}</p>
        ) : (
          <p className="text-gray-400">Generating expert summary...</p>
        )}
      </div>
      
      {(results.timeHomogeneityTest || results.markovOrderTest) && (
        <div>
          <h3 className="text-2xl font-bold text-gray-100 mb-4">Advanced Process Analysis (on Instance1)</h3>
          <AdvancedAnalysisDisplay results={results} />
        </div>
      )}

      <div>
        <div className="flex items-center mb-4">
            <ChartLineIcon className="h-7 w-7 text-teal-400 mr-3" />
            <h3 className="text-2xl font-bold text-gray-100">Transition Probability Evolution by Target State</h3>
        </div>
        <p className="text-gray-400 mb-6 -mt-2 text-sm">
            These charts show the probability of transitioning TO a specific state (e.g., State A) FROM every other state, at each point in time. This helps visualize the process dynamics and time-homogeneity.
        </p>
        <div className="space-y-8">
            {Object.entries(results.transitionProbabilitiesOverTime).map(([targetState, data]) => (
                <div key={targetState} className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
                    <SelfDependenceChart
                        title={`Evolution of P(Xt = ${targetState} | Xt-1)`}
                        timeSteps={results.timeSteps}
                        data={data}
                        states={results.states}
                    />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};