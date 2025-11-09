import React, { useCallback } from 'react';
import { ModelDef, VariableInfo } from '../types';
import { ModelEditor } from './ModelEditor';
import { PlusIcon } from './icons/PlusIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';

interface ModelsManagerProps {
  models: ModelDef[];
  setModels: React.Dispatch<React.SetStateAction<ModelDef[]>>;
  variableInfo: VariableInfo[];
}

export const ModelsManager: React.FC<ModelsManagerProps> = ({ models, setModels, variableInfo }) => {

  const handleAddModel = () => {
    const newModel: ModelDef = {
      id: Date.now().toString(),
      name: `Model ${models.length + 1}`,
      variables: JSON.parse(JSON.stringify(variableInfo)), // Deep copy
      probabilities: {},
      error: null,
      modelString: '',
    };
    setModels(prev => [...prev, newModel]);
  };

  const handleUpdateModel = useCallback((id: string, updatedModel: Partial<ModelDef>) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...updatedModel } : m));
  }, [setModels]);

  const handleDeleteModel = useCallback((id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  }, [setModels]);

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-center mb-4">
        <CalculatorIcon className="h-7 w-7 text-teal-400 mr-3" />
        <h2 className="text-2xl font-bold text-gray-100">2. Define Models (Optional)</h2>
      </div>
      <p className="text-gray-400 mb-6">
        Add one or more theoretical models to compare against your dataset. Variables are populated from your dataset headers.
      </p>

      <div className="space-y-6">
        {models.map(model => (
          <ModelEditor
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
          className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700/50 hover:border-gray-500 hover:text-gray-300 transition-all"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add New Model
        </button>
      </div>
    </div>
  );
};