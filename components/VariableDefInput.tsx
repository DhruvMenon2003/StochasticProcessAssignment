import React from 'react';
import { VariableInfo } from '../types';

interface VariableInfoInputProps {
  variable: VariableInfo;
  onChange: (updatedVar: VariableInfo) => void;
}

export const VariableInfoInput: React.FC<VariableInfoInputProps> = ({ variable, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-900/50 p-3 rounded-md border border-gray-700">
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Variable Name
        </label>
        <input
          type="text"
          value={variable.name}
          readOnly
          className="w-full p-2 bg-gray-700/50 text-gray-400 border border-gray-600 rounded-md focus:ring-0 focus:outline-none cursor-default text-sm"
        />
      </div>
       <div className="md:col-span-1">
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Detected Type
        </label>
        <input
          type="text"
          value={variable.type.charAt(0).toUpperCase() + variable.type.slice(1)}
          readOnly
          className="w-full p-2 bg-gray-700/50 text-gray-400 border border-gray-600 rounded-md focus:ring-0 focus:outline-none cursor-default text-sm"
        />
      </div>
      <div className="md:col-span-2">
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