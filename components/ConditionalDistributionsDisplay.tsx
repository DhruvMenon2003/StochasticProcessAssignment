import React, { useState } from 'react';
import { SelfDependenceAnalysis } from '../types';
import { ConditionalProbabilityTableDisplay } from './ConditionalProbabilityTableDisplay';

interface ConditionalDistributionsDisplayProps {
  analysis: SelfDependenceAnalysis;
}

export const ConditionalDistributionsDisplay: React.FC<ConditionalDistributionsDisplayProps> = ({ analysis }) => {
  const { conditionalDistributionSets } = analysis;
  const [selectedOrder, setSelectedOrder] = useState(1);
  
  if (!conditionalDistributionSets || conditionalDistributionSets.length === 0) return null;

  const selectedSet = conditionalDistributionSets.find(s => s.order === selectedOrder);

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700 space-y-6">
      <div>
        <label htmlFor="order-select" className="block text-sm font-medium text-gray-400 mb-2">
          Select Model Order to View Conditional Distributions:
        </label>
        <select
          id="order-select"
          value={selectedOrder}
          onChange={(e) => setSelectedOrder(Number(e.target.value))}
          className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          {conditionalDistributionSets.map(s => (
            <option key={s.order} value={s.order}>
              {s.order}-Order Model {s.order === 1 && '(Markovian)'}
            </option>
          ))}
        </select>
      </div>

      {selectedSet && (
        <div className="space-y-8">
            <p className="text-sm text-gray-400">
                Displaying the set of conditional probability distributions used to construct the {selectedOrder}-order model. Each table shows the probability of a state at a given time point, conditioned on the state(s) of previous time points.
            </p>
          {selectedSet.distributions.map((dist, i) => (
            <ConditionalProbabilityTableDisplay key={i} table={dist} />
          ))}
        </div>
      )}
    </div>
  );
};
