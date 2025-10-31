import React from 'react';
import { Distribution } from '../types';
import { MetricCard } from './MetricCard';

interface DistributionDetailCardProps {
  title: string;
  distribution?: Distribution;
  cmf?: Distribution;
  moments?: { mean: number; variance: number };
  isBest?: boolean;
}

const DistDisplay: React.FC<{ dist: Distribution; title: string; }> = ({ dist, title }) => {
  const sortedEntries = Object.entries(dist).sort((a, b) => Number(a[0]) - Number(b[0]));
  return (
    <div>
      <h4 className="font-semibold text-base text-gray-300 mb-2">{title}</h4>
      <div className="bg-gray-900/50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border border-gray-700">
        {sortedEntries
            .map(([key, value]) => `${key}: ${value.toFixed(4)}`)
            .join('\n')}
      </div>
    </div>
  );
};

export const DistributionDetailCard: React.FC<DistributionDetailCardProps> = ({ title, distribution, cmf, moments, isBest }) => {
  return (
    <div className={`bg-gray-800/50 p-4 rounded-lg shadow-md border ${isBest ? 'border-teal-500' : 'border-gray-700'} space-y-4`}>
        <h3 className={`text-xl font-bold ${isBest ? 'text-teal-300' : 'text-gray-100'}`}>
            {title} {isBest && '⭐'}
        </h3>

        <div className="grid grid-cols-2 gap-4">
            {moments && <MetricCard title="Mean" value={moments.mean.toFixed(4)} description="The expected average value." />}
            {moments && <MetricCard title="Variance" value={moments.variance.toFixed(4)} description="The spread of the distribution." />}
        </div>
        
        {distribution && <DistDisplay dist={distribution} title="Probability Mass Fn (PMF)" />}
        {cmf && <DistDisplay dist={cmf} title="Cumulative Mass Fn (CMF)" />}
    </div>
  );
};
