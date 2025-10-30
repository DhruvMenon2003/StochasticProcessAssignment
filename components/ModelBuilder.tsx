import React from 'react';
import { VariableDef } from '../types';
import { VariableDefInput } from './VariableDefInput';
import { ProbabilityTable } from './ProbabilityTable';
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';

interface ModelBuilderProps {
  variables: VariableDef[];
  setVariables: React.Dispatch<React.SetStateAction<VariableDef[]>>;
  probabilities: Record<string, number>;
  setProbabilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export const ModelBuilder: React.FC<ModelBuilderProps> = ({
  variables,
  setVariables,
  probabilities,
  setProbabilities
}) => {

  const handleVariableCountChange = (newCount: number) => {
    if (newCount > 0 && newCount <= 5) { // Cap at 5 for performance/UI reasons
      const currentCount = variables.length;
      if (newCount > currentCount) {
        const newVars = Array.from({ length: newCount - currentCount }, (_, i) => ({
          name: `Var${currentCount + i + 1}`,
          states: ''
        }));
        setVariables([...variables, ...newVars]);
      } else {
        setVariables(variables.slice(0, newCount));
      }
      setProbabilities({}); // Reset probabilities when structure changes
    }
  };

  const handleVariableChange = (index: number, updatedVar: VariableDef) => {
    const newVariables = [...variables];
    newVariables[index] = updatedVar;
    setVariables(newVariables);
    setProbabilities({}); // Reset probabilities when structure changes
  };

  const hasValidDefinitions = variables.every(v => v.name.trim() && v.states.trim());

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="variable-count" className="block text-sm font-medium text-gray-400 mb-2">
          Number of Random Variables
        </label>
        <div className="flex items-center gap-2">
          <button onClick={() => handleVariableCountChange(variables.length - 1)} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50" disabled={variables.length <= 1}>
             <MinusIcon className="h-5 w-5" />
          </button>
          <span className="px-4 py-1.5 bg-gray-900 border border-gray-600 rounded-md font-mono">{variables.length}</span>
          <button onClick={() => handleVariableCountChange(variables.length + 1)} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50" disabled={variables.length >= 5}>
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {variables.map((variable, index) => (
          <VariableDefInput
            key={index}
            variable={variable}
            onChange={(updatedVar) => handleVariableChange(index, updatedVar)}
          />
        ))}
      </div>

      {hasValidDefinitions && (
        <ProbabilityTable
          variables={variables}
          probabilities={probabilities}
          setProbabilities={setProbabilities}
        />
      )}
    </div>
  );
};
