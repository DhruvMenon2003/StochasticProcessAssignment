import React from 'react';
import { ConditionalDistributionTable } from '../types';
import { ConditionalDistributionDisplay } from './ConditionalDistributionDisplay';

interface DependenceAnalysisDisplayProps {
  distributions?: ConditionalDistributionTable[];
}

export const DependenceAnalysisDisplay: React.FC<DependenceAnalysisDisplayProps> = ({ distributions }) => {
  if (!distributions || distributions.length === 0) {
    return null;
  }
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700 space-y-6">
      <h4 className="font-semibold text-lg text-gray-200 mb-3">Dependence Analysis</h4>
      <p className="text-sm text-gray-400 mb-4">
        Examines how variables influence each other through conditional distributions.
      </p>
      {distributions.map((dist, i) => (
        <ConditionalDistributionDisplay key={i} distribution={dist} />
      ))}
    </div>
  );
};
