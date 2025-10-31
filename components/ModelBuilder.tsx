import React from 'react';
import { VariableDef } from '../types';
import { VariableDefInput } from './VariableDefInput';
import { ProbabilityTable } from './ProbabilityTable';

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

  const handleVariableChange = (index: number, updatedVar: VariableDef) => {
    const newVariables = [...variables];
    newVariables[index] = updatedVar;
    setVariables(newVariables);
    setProbabilities({}); // Reset probabilities when structure changes
  };

  const hasValidDefinitions = variables.length > 0 && variables.every(v => v.name.trim() && v.states.trim());

  return (
    <div className="space-y-6">
      {variables.length > 0 ? (
        <div className="space-y-4">
          {variables.map((variable, index) => (
            <VariableDefInput
              key={variable.name}
              variable={variable}
              onChange={(updatedVar) => handleVariableChange(index, updatedVar)}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic px-3 py-2 bg-gray-900/50 rounded-md border border-gray-700">
          Provide a dataset with headers in the section above to define variables.
        </p>
      )}

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