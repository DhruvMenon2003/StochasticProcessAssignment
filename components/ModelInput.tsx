
import React from 'react';
import { CalculatorIcon } from './icons/CalculatorIcon';

interface ModelInputProps {
  value: string;
  onChange: (value: string) => void;
}

const exampleModel = `[
  { "states": { "VarX": "A", "VarY": "1" }, "probability": 0.25 },
  { "states": { "VarX": "A", "VarY": "2" }, "probability": 0.1 },
  { "states": { "VarX": "B", "VarY": "1" }, "probability": 0.15 },
  { "states": { "VarX": "B", "VarY": "2" }, "probability": 0.2 },
  { "states": { "VarX": "C", "VarY": "1" }, "probability": 0.1 },
  { "states": { "VarX": "C", "VarY": "2" }, "probability": 0.2 }
]`;

export const ModelInput: React.FC<ModelInputProps> = ({ value, onChange }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-center mb-4">
        <CalculatorIcon className="h-7 w-7 text-teal-400 mr-3" />
        <h2 className="text-2xl font-bold text-gray-100">2. Define a Model (Optional)</h2>
      </div>
      <p className="text-gray-400 mb-4">
        Provide a theoretical Joint PMF in JSON format to compare against your data.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={exampleModel}
        className="w-full h-64 p-3 bg-gray-900 text-gray-300 border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors font-mono text-sm"
      />
    </div>
  );
};
