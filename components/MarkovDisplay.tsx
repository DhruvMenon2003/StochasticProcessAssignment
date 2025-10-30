import React, { useState } from 'react';
import { MarkovResult } from '../services/stochasticService';
import { TransitionMatrixDisplay } from './TransitionMatrixDisplay';
import { StationaryDistributionDisplay } from './StationaryDistributionDisplay';

interface MarkovDisplayProps {
  results: MarkovResult;
}

export const MarkovDisplay: React.FC<MarkovDisplayProps> = ({ results }) => {
  const variables = Object.keys(results);
  const [selectedVar, setSelectedVar] = useState(variables[0]);

  if (!selectedVar || !results[selectedVar]) {
    return null;
  }

  const { states, transitionMatrix, stationaryDistribution } = results[selectedVar];

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700 space-y-6">
      <div>
        <label htmlFor="markov-variable-select" className="block text-sm font-medium text-gray-400 mb-2">
          Select variable to analyze as a Markov chain:
        </label>
        <select
          id="markov-variable-select"
          value={selectedVar}
          onChange={(e) => setSelectedVar(e.target.value)}
          className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          {variables.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <TransitionMatrixDisplay matrix={transitionMatrix} states={states} />
        <StationaryDistributionDisplay distribution={stationaryDistribution} />
      </div>
    </div>
  );
};
