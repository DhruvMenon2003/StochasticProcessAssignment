
import React from 'react';
import { Distribution, Moments } from '../types';
import { MetricCard } from './MetricCard';

interface DistributionDetailCardProps {
  title: string;
  distribution?: Distribution;
  cmf?: Distribution;
  moments?: Moments;
  isBest?: boolean;
}

const DistDisplay: React.FC<{ dist: Distribution; title: string; }> = ({ dist, title }) => {
  const sortedEntries = Object.entries(dist).sort(([keyA], [keyB]) => {
    const numA = Number(keyA);
    const numB = Number(keyB);
    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    }
    return keyA.localeCompare(keyB);
  });
  if (sortedEntries.length === 0) return null;

  return (
    <div>
        <h4 className="font-semibold text-base text-gray-300 mb-2">{title}</h4>
        <div className="bg-gray-900/50 rounded-md text-sm font-mono max-h-40 overflow-y-auto border border-gray-700">
            <table className="w-full text-left">
                <thead className="sticky top-0 bg-gray-800 z-10">
                    <tr className="border-b border-gray-600">
                        <th className="p-2 font-semibold">State</th>
                        <th className="p-2 font-semibold text-right">Probability</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedEntries.map(([key, value]) => (
                        <tr key={key} className="border-b border-gray-700 last:border-b-0">
                            <td className="p-2">{key}</td>
                            <td className="p-2 text-right">{(value as number).toFixed(4)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export const DistributionDetailCard: React.FC<DistributionDetailCardProps> = ({ title, distribution, cmf, moments, isBest }) => {
  const modeString = moments?.mode ? moments.mode.join(', ') : 'N/A';
  
  return (
    <div className={`bg-gray-800/50 p-4 rounded-lg shadow-md border ${isBest ? 'border-teal-500' : 'border-gray-700'} space-y-4`}>
        <h3 className={`text-xl font-bold ${isBest ? 'text-teal-300' : 'text-gray-100'}`}>
            {title} {isBest && '⭐'}
        </h3>

        <div className="grid grid-cols-2 gap-4">
            {moments?.mode !== null && typeof moments?.mode !== 'undefined' && <MetricCard title="Mode" value={modeString} description="The most frequently occurring value(s)." />}
            {moments?.median !== null && typeof moments?.median !== 'undefined' && <MetricCard title="Median" value={String(moments.median)} description="The middle value of the dataset." />}
            {moments?.mean !== null && typeof moments?.mean !== 'undefined' && !isNaN(moments.mean) && <MetricCard title="Mean" value={moments.mean.toFixed(4)} description="The expected average value." />}
            {moments?.variance !== null && typeof moments?.variance !== 'undefined' && !isNaN(moments.variance) && <MetricCard title="Variance" value={moments.variance.toFixed(4)} description="The spread of the distribution." />}
        </div>
        
        {distribution && <DistDisplay dist={distribution} title="Probability Mass Fn (PMF)" />}
        {cmf && <DistDisplay dist={cmf} title="Cumulative Mass Fn (CMF)" />}
    </div>
  );
};