import React from 'react';

interface MomentsDisplayProps {
  title: string;
  moments?: { [key: string]: { mean: number; variance: number } };
}

export const MomentsDisplay: React.FC<MomentsDisplayProps> = ({ title, moments }) => {
  if (!moments) {
    return null;
  }
  
  const validMoments = Object.entries(moments).filter(([_, m]) => !isNaN(m.mean));

  if (validMoments.length === 0) {
    return null; // Don't render if no numeric variables have moments
  }

  return (
    <div>
      <h4 className="font-semibold text-lg text-gray-300 mb-2">{title}</h4>
      <div className="bg-gray-800 p-3 rounded-md text-sm font-mono whitespace-pre-wrap border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {validMoments.map(([variable, { mean, variance }]) => (
                <div key={variable}>
                    <span className="font-semibold text-gray-400">{variable}:</span>
                    <div className="pl-4">
                        <span>E(X): <span className="text-teal-300">{mean.toFixed(4)}</span></span>,{' '}
                        <span>Var(X): <span className="text-teal-300">{variance.toFixed(4)}</span></span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
