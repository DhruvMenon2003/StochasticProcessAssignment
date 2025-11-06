import React, { useCallback } from 'react';
import { TransitionMatrixModelDef } from '../types';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TransitionMatrixEditor } from './TransitionMatrixEditor';

interface TransitionMatrixModelsManagerProps {
  models: TransitionMatrixModelDef[];
  setModels: React.Dispatch<React.SetStateAction<TransitionMatrixModelDef[]>>;
  states: (string|number)[];
}

export const TransitionMatrixModelsManager: React.FC<TransitionMatrixModelsManagerProps> = ({ models, setModels, states }) => {

  const handleAddModel = () => {
    const newModel: TransitionMatrixModelDef = {
      id: Date.now().toString(),
      name: `TM Model ${models.length + 1}`,
      variableName: 'State',
      states: states,
      matrix: Array(states.length).fill(0).map(() => Array(states.length).fill(null)),
      error: null,
    };
    setModels(prev => [...prev, newModel]);
  };

  const handleUpdateModel = useCallback((id: string, updatedModel: Partial<TransitionMatrixModelDef>) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...updatedModel } : m));
  }, [setModels]);

  const handleDeleteModel = useCallback((id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  }, [setModels]);

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-center mb-4">
        <CalculatorIcon className="h-7 w-7 text-teal-400 mr-3" />
        <h2 className="text-2xl font-bold text-gray-100">2. Define Transition Models (Optional)</h2>
      </div>
      <p className="text-gray-400 mb-6">
        Add theoretical transition probability matrices to compare against the empirical data.
      </p>

      <div className="space-y-6">
        {models.map(model => (
          <TransitionMatrixEditor
            key={model.id}
            model={model}
            onUpdate={handleUpdateModel}
            onDelete={handleDeleteModel}
          />
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={handleAddModel}
          disabled={states.length === 0}
          className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700/50 hover:border-gray-500 hover:text-gray-300 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add New Transition Matrix
        </button>
      </div>
    </div>
  );
};
