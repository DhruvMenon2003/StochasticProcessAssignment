import React from 'react';
// Fix: Renamed imported type to avoid name collision with the component.
import { AnalysisOptions as AnalysisOptionsType } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import { CalculatorIcon } from './icons/CalculatorIcon';

interface AnalysisOptionsProps {
  options: AnalysisOptionsType;
  setOptions: React.Dispatch<React.SetStateAction<AnalysisOptionsType>>;
  disabled?: boolean;
}

export const AnalysisOptions: React.FC<AnalysisOptionsProps> = ({ options, setOptions, disabled = false }) => {
  const handleToggle = (optionKey: keyof AnalysisOptionsType) => {
    if (disabled) return;
    setOptions(prev => ({ ...prev, [optionKey]: !prev[optionKey] }));
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-center mb-4">
        <CalculatorIcon className="h-7 w-7 text-teal-400 mr-3" />
        <h2 className="text-2xl font-bold text-gray-100">3. Analysis Options</h2>
      </div>
      <p className="text-gray-400 mb-6">
        Enable advanced tests for deeper insights into the process characteristics.
        {disabled && <span className="block text-sm text-blue-400 italic">Options are automatically enabled for Time Series analysis modes.</span>}
      </p>
      <div className="space-y-4">
        <ToggleSwitch
          label="Analyze Dependence Order"
          description="Calculates process memory depth (1st, 2nd, ... order)."
          enabled={options.runMarkovOrderTest}
          onChange={() => handleToggle('runMarkovOrderTest')}
          disabled={disabled}
        />
      </div>
    </div>
  );
};