import React, { useState, useEffect } from 'react';
// Fix: Import VariableInfo to be used in handler function types.
import { ModelDef, ProbabilityModel, VariableInfo } from '../types';
import { ModelBuilder } from './ModelBuilder';
import { TrashIcon } from './icons/TrashIcon';
import { cartesianProduct } from '../utils/mathUtils';
import { MinusIcon } from './icons/MinusIcon';
import { PlusIcon } from './icons/PlusIcon';

interface ModelEditorProps {
  model: ModelDef;
  onUpdate: (id: string, updatedModel: Partial<ModelDef>) => void;
  onDelete: (id: string) => void;
}

export const ModelEditor: React.FC<ModelEditorProps> = ({ model, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Effect to sync model builder state with the parent modelString
  useEffect(() => {
    if (model.variables.some(v => !v.name || !v.states)) {
      onUpdate(model.id, { modelString: '', error: null });
      return;
    }
    
    const stateSpaces = model.variables.map(v => v.states.split(',').map(s => s.trim()).filter(Boolean));
    if (stateSpaces.some(ss => ss.length === 0)) {
      onUpdate(model.id, { modelString: '', error: null });
      return;
    }

    const allCombinations = cartesianProduct(...stateSpaces);
    
    let totalProb = 0;
    const modelDef: ProbabilityModel = allCombinations.map(combo => {
      const key = combo.join('|');
      const probability = model.probabilities[key] || 0;
      totalProb += probability;
      const states: Record<string, string | number> = {};
      model.variables.forEach((v, i) => {
        const stateValue = combo[i];
        // FIX: Use String(stateValue) to handle `unknown` type. `stateValue` alone is not assignable to `string | number`.
        states[v.name] = v.type === 'numerical' && !isNaN(Number(stateValue)) ? Number(stateValue) : String(stateValue);
      });
      return { states, probability };
    });

    let error = null;
    if (Math.abs(totalProb - 1.0) > 0.0001 && totalProb > 0) {
        error = `Probabilities sum to ${totalProb.toFixed(4)}, but should sum to 1.`;
    }
    
    onUpdate(model.id, {
        modelString: JSON.stringify(modelDef),
        error: error
    });

  }, [model.id, model.variables, model.probabilities, onUpdate]);

  // Fix: Create handlers to resolve the SetStateAction before calling onUpdate.
  // This correctly handles cases where the state update is a function.
  const handleSetVariables = (vars: React.SetStateAction<VariableInfo[]>) => {
    const newVariables = typeof vars === 'function' ? vars(model.variables) : vars;
    onUpdate(model.id, { variables: newVariables, probabilities: {} });
  };

  const handleSetProbabilities = (probs: React.SetStateAction<Record<string, number>>) => {
    const newProbabilities = typeof probs === 'function' ? probs(model.probabilities) : probs;
    onUpdate(model.id, { probabilities: newProbabilities });
  };

  return (
    <div className="bg-gray-900/70 border border-gray-700 rounded-lg">
      <div className="flex items-center p-3 bg-gray-800/60 rounded-t-lg">
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-gray-400 hover:text-white">
            {isOpen ? <MinusIcon className="w-5 h-5"/> : <PlusIcon className="w-5 h-5"/>}
        </button>
        <input
          type="text"
          value={model.name}
          onChange={(e) => onUpdate(model.id, { name: e.target.value })}
          className="mx-2 flex-grow p-1 bg-transparent text-lg font-semibold text-gray-200 focus:ring-0 focus:outline-none focus:bg-gray-700/50 rounded-md"
        />
        <button
          onClick={() => onDelete(model.id)}
          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-full transition-colors"
          aria-label="Delete model"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
      
      {isOpen && (
        <div className="p-4">
          <ModelBuilder
            variables={model.variables}
            setVariables={handleSetVariables}
            probabilities={model.probabilities}
            setProbabilities={handleSetProbabilities}
          />
          {model.error && <p id="model-error" className="mt-4 text-sm text-red-400 bg-red-900/30 p-2 rounded-md">{model.error}</p>}
        </div>
      )}
    </div>
  );
};