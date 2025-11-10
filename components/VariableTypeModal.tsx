import React, { useState, useEffect } from 'react';
import { VariableInfo } from '../types';

interface VariableTypeModalProps {
  isOpen: boolean;
  initialVariables: VariableInfo[];
  onConfirm: (variables: VariableInfo[]) => void;
  onCancel: () => void;
}

export const VariableTypeModal: React.FC<VariableTypeModalProps> = ({ isOpen, initialVariables, onConfirm, onCancel }) => {
  const [variables, setVariables] = useState<VariableInfo[]>([]);

  useEffect(() => {
    // Deep copy to avoid mutating the prop directly
    setVariables(JSON.parse(JSON.stringify(initialVariables)));
  }, [initialVariables]);

  const handleTypeChange = (index: number, newType: 'numerical' | 'nominal' | 'ordinal') => {
    setVariables(prev => {
      const newVars = [...prev];
      newVars[index].type = newType;
      return newVars;
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Define Variable Types</h2>
          <p className="text-gray-400 mb-6">
            We've detected the following variables from your data. Please confirm or correct their types to ensure accurate analysis.
          </p>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {variables.map((variable, index) => (
              <div key={variable.name} className="grid grid-cols-5 gap-4 items-center bg-gray-900/50 p-3 rounded-md border border-gray-700">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Variable Name</label>
                  <input
                    type="text"
                    value={variable.name}
                    readOnly
                    className="w-full p-2 bg-gray-700/50 text-gray-400 border border-gray-600 rounded-md focus:ring-0 focus:outline-none cursor-default text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Variable Type</label>
                  <select
                    value={variable.type}
                    onChange={(e) => handleTypeChange(index, e.target.value as 'numerical' | 'nominal' | 'ordinal')}
                    className="w-full p-2 bg-gray-800 text-gray-300 border border-gray-600 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors text-sm"
                  >
                    <option value="numerical">Numerical</option>
                    <option value="nominal">Categorical (Nominal)</option>
                    <option value="ordinal">Categorical (Ordinal)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900/50 px-6 py-4 rounded-b-lg flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(variables)}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors"
          >
            Confirm Variable Types
          </button>
        </div>
      </div>
    </div>
  );
};
