import React from 'react';
// Fix: Renamed imported type to avoid name collision with the component.
import { AnalysisOptions as AnalysisOptionsType } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import { CalculatorIcon } from './icons/CalculatorIcon';

interface AnalysisOptionsProps {
  options: AnalysisOptionsType;
  setOptions: React.Dispatch<React.SetStateAction<AnalysisOptionsType>>;
}

export const AnalysisOptions: React.FC<AnalysisOptionsProps> = ({ options, setOptions }) => {
  const handleToggle = (optionKey: keyof AnalysisOptionsType) => {
    setOptions(prev => ({ ...prev, [optionKey]: !prev[optionKey] }));
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border-gray-700">
      <div className="flex items-center mb-4">
        <CalculatorIcon className="h-7 w-7 text-teal-400 mr-3" />
        <h2 className="text-2xl font-bold text-gray-100">3. Analysis Options</h2>
      </div>
      <p className="text-gray-400 mb-6">
        Enable advanced tests for deeper insights into the process characteristics.
      </p>
      <div className="space-y-4">
        <ToggleSwitch
          label="Self-Dependence Test"
          description="Tests if the process has memory (1st-order Markov property)."
          enabled={options.runMarkovOrderTest}
          onChange={() => handleToggle('runMarkovOrderTest')}
        />
        <ToggleSwitch
          label="Time Homogeneity Test"
          description="Tests if the process behavior is stable over time."
          enabled={options.runTimeHomogeneityTest}
          onChange={() => handleToggle('runTimeHomogeneityTest')}
        />
      </div>
    </div>
  );
};
