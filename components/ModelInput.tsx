import React from 'react';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ModelBuilder } from './ModelBuilder';
import { VariableDef } from '../types';

interface ModelInputProps {
  variables: VariableDef[];
  setVariables: React.Dispatch<React.SetStateAction<VariableDef[]>>;
  probabilities: Record<string, number>;
  setProbabilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  error: string | null;
}

export const ModelInput: React.FC<ModelInputProps> = ({ 
  variables, 
  setVariables, 
  probabilities, 
  setProbabilities,
  error 
}) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-center mb-4">
        <CalculatorIcon className="h-7 w-7 text-teal-400 mr-3" />
        <h2 className="text-2xl font-bold text-gray-100">2. Define a Model (Optional)</h2>
      </div>
      <p className="text-gray-400 mb-4">
        Define variables and their states to build a probability table for your theoretical model.
      </p>
      
      <ModelBuilder
        variables={variables}
        setVariables={setVariables}
        probabilities={probabilities}
        setProbabilities={setProbabilities}
      />

      {error && <p id="model-error" className="mt-4 text-sm text-red-400 bg-red-900/30 p-2 rounded-md">{error}</p>}
    </div>
  );
};
