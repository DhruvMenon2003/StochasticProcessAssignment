
import React from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface DataInputProps {
  value: string;
  onChange: (value: string) => void;
}

const exampleData = `VarX,VarY
A,1
B,2
A,1
A,2
B,1
C,2
A,1
B,2
C,1`;

export const DataInput: React.FC<DataInputProps> = ({ value, onChange }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-center mb-4">
        <UploadIcon className="h-7 w-7 text-blue-400 mr-3" />
        <h2 className="text-2xl font-bold text-gray-100">1. Input Your Dataset</h2>
      </div>
      <p className="text-gray-400 mb-4">
        Paste your data in CSV format. The first line must be the header with variable names.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={exampleData}
        className="w-full h-64 p-3 bg-gray-900 text-gray-300 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
      />
    </div>
  );
};
