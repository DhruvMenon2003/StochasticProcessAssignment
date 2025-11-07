import React, { useState } from 'react';
import { SelfDependenceAnalysis } from '../types';
import { ConditionalProbabilityTableDisplay } from './ConditionalProbabilityTableDisplay';
import { JointDistributionDisplay } from './JointDistributionDisplay';

interface ConditionalDistributionsDisplayProps {
  analysis: SelfDependenceAnalysis;
}

export const ConditionalDistributionsDisplay: React.FC<ConditionalDistributionsDisplayProps> = ({ analysis }) => {
  const { conditionalDistributionSets, timeSteps } = analysis;
  const [selectedOrder, setSelectedOrder] = useState(1);
  
  if (!conditionalDistributionSets || conditionalDistributionSets.length === 0) return null;

  const selectedSet = conditionalDistributionSets.find(s => s.order === selectedOrder);

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700 space-y-6">
      <div>
        <label htmlFor="order-select" className="block text-sm font-medium text-gray-400 mb-2">
          Select Model Order to View Distributions:
        </label>
        <select
          id="order-select"
          value={selectedOrder}
          onChange={(e) => setSelectedOrder(Number(e.target.value))}
          className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        >
          {conditionalDistributionSets.map(s => (
            <option key={s.order} value={s.order}>
              {s.order}-Order Model {s.order === 1 ? '(Markovian)' : s.order === conditionalDistributionSets.length ? '(Full Past)' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedSet && (
        <div className="space-y-8">
            {selectedSet.jointDistribution && timeSteps && (
              <div>
                <h3 className="text-xl font-bold text-gray-100 mb-4">
                    Joint Distribution ({selectedOrder}-Order Model)
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    The full joint probability for every possible sequence, calculated using the chain rule based on the {selectedOrder}-order assumption.
                </p>
                <JointDistributionDisplay 
                    distribution={selectedSet.jointDistribution} 
                    headers={timeSteps}
                />
              </div>
            )}
            <div>
                <h3 className="text-xl font-bold text-gray-100 mb-4">
                    Conditional Distributions ({selectedOrder}-Order Model)
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                    Displaying the set of conditional probability distributions used to construct the {selectedOrder}-order model. Each table shows the probability of a state at a given time point, conditioned on the state(s) of previous time points.
                </p>
            </div>
          {selectedSet.distributions.length > 0 ? (
            selectedSet.distributions.map((dist, i) => (
                <ConditionalProbabilityTableDisplay key={i} table={dist} />
             ))
          ) : (
             <p className="text-gray-500 italic px-3 py-2 bg-gray-900/50 rounded-md border border-gray-700">
                The 1-Order model is based on the initial state distribution and subsequent transitions from the time-averaged empirical matrix. Individual conditional tables are not displayed for this base case.
            </p>
          )}
        </div>
      )}
    </div>
  );
};