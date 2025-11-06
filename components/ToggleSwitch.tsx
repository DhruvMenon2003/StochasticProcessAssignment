import React from 'react';

interface ToggleSwitchProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, description, enabled, onChange, disabled = false }) => {
  return (
    <div
      onClick={onChange}
      className={`flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700 transition-colors ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700/50'
      }`}
    >
      <div>
        <h4 className={`font-semibold ${disabled ? 'text-gray-400' : 'text-gray-200'}`}>{label}</h4>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <div
        className={`${
          enabled ? 'bg-blue-600' : 'bg-gray-600'
        } relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
      >
        <span
          className={`${
            enabled ? 'translate-x-6' : 'translate-x-1'
          } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
        />
      </div>
    </div>
  );
};