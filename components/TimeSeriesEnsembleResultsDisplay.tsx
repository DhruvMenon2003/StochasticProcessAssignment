import React from 'react';
import { AnalysisResult } from '../types';
import { AdvancedAnalysisDisplay } from './AdvancedAnalysisDisplay';
import { TransitionMatrixDisplay } from './TransitionMatrixDisplay';

interface TimeSeriesEnsembleResultsDisplayProps {
  results: AnalysisResult;
  explanation: string | null;
}

export const TimeSeriesEnsembleResultsDisplay: React.FC<TimeSeriesEnsembleResultsDisplayProps> = ({ results, explanation }) => {

  return (
    <div className="space-y-12">
      <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 mb-4">
          Ensemble Analysis Summary
        </h2>
        {explanation ? (
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{explanation}</p>
        ) : (
          <p className="text-gray-400">Generating expert summary...</p>
        )}
      </div>
      
      <div className="space-y-8">
        <h3 className="text-2xl font-bold text-gray-100 mb-4">Transition Matrix Analysis</h3>
        
        {results.empiricalTransitionMatrix && results.ensembleStates && (
            <TransitionMatrixDisplay 
                title="Empirical Transition Matrix (Time-Averaged)"
                matrix={results.empiricalTransitionMatrix}
                states={results.ensembleStates}
            />
        )}
        
        {results.modelResults && results.modelResults.map(model => (
            model.matrix && results.ensembleStates && (
                 <div key={model.name} className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
                    <TransitionMatrixDisplay 
                        title={`Model: ${model.name}`}
                        matrix={model.matrix}
                        states={results.ensembleStates}
                    />
                    <p className="text-right text-sm mt-4 text-gray-400">
                        Avg. Hellinger Distance: 
                        <span className="font-bold text-teal-300 ml-2">
                            {model.comparisonMetrics?.['Avg Hellinger Distance']?.value.toFixed(5) ?? 'N/A'}
                        </span>
                    </p>
                </div>
            )
        ))}

      </div>


      {results.advancedTests && (
        <div>
           <h3 className="text-2xl font-bold text-gray-100 mb-4">Advanced Diagnostics</h3>
           <AdvancedAnalysisDisplay results={results.advancedTests} />
        </div>
      )}
    </div>
  );
};
