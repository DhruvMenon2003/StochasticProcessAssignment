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
      <div className="bg-gray-800 rounded-md text-sm font-mono max-h-80 overflow-auto border border-gray-700">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-600">
              <th className="p-3 font-semibold">Variable</th>
              <th className="p-3 font-semibold text-center">Expectation (Mean)</th>
              <th className="p-3 font-semibold text-center">Variance</th>
            </tr>
          </thead>
          <tbody>
            {validMoments.map(([variable, { mean, variance }]) => (
              <tr key={variable} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                <th className="p-3 font-semibold bg-gray-800 sticky left-0">{variable}</th>
                <td className="p-3 text-center">
                  {mean.toFixed(4)}
                </td>
                <td className="p-3 text-center">
                  {variance.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
