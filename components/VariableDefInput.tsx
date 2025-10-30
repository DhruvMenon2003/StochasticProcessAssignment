import React from 'react';
import { VariableDef } from '../types';

interface VariableDefInputProps {
  variable: VariableDef;
  onChange: (updatedVar: VariableDef) => void;
}

export const VariableDefInput: React.FC<VariableDefInputProps> = ({ variable, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/50 p-3 rounded-md border border-gray-700">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Variable Name
        </label>
        <input
          type="text"
          value={variable.name}
          onChange={(e) => onChange({ ...variable, name: e.target.value })}
          placeholder="e.g., VarX"
          className="w-full p-2 bg-gray-800 text-gray-300 border border-gray-600 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          State Space (comma-separated)
        </label>
        <input
          type="text"
          value={variable.states}
          onChange={(e) => onChange({ ...variable, states: e.target.value })}
          placeholder="e.g., A, B, C"
          className="w-full p-2 bg-gray-800 text-gray-300 border border-gray-600 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors text-sm"
        />
      </div>
    </div>
  );
};
