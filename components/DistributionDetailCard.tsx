import React from 'react';
import { Distribution, Moments } from '../types';

interface DistributionDetailCardProps {
  title: string;
  distribution: Distribution;
  cmf?: Distribution;
  moments?: Moments;
  isBest?: boolean;
}

export const DistributionDetailCard: React.FC<DistributionDetailCardProps> = ({ title, distribution, moments, isBest }) => {
  const sortedEntries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  return (
    <div className={`bg-gray-800 p-4 rounded-lg border ${isBest ? 'border-teal-500 shadow-teal-500/20 shadow-lg' : 'border-gray-700'}`}>
      <h4 className={`font-semibold text-lg ${isBest ? 'text-teal-300' : 'text-gray-300'} mb-2`}>{title} {isBest && '⭐'}</h4>
      <div className="space-y-3">
        <div>
          <h5 className="text-xs font-bold text-gray-400 uppercase mb-1">Marginal Distribution</h5>
          <div className="bg-gray-900/50 p-2 rounded-md text-sm font-mono max-h-40 overflow-y-auto">
            {sortedEntries.map(([state, prob]) => (
              <div key={state} className="flex justify-between items-center">
                <span className="text-gray-400">{state}:</span>
                <span className="font-bold text-gray-200">{prob.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
        {moments && !isNaN(moments.mean) && (
          <div>
            <h5 className="text-xs font-bold text-gray-400 uppercase mb-1">Moments</h5>
            <div className="bg-gray-900/50 p-2 rounded-md text-sm font-mono space-y-1">
              <div className="flex justify-between"><span>Mean:</span><span>{moments.mean.toFixed(4)}</span></div>
              <div className="flex justify-between"><span>Variance:</span><span>{moments.variance.toFixed(4)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
