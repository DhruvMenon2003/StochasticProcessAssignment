import React, { useState, useEffect } from 'react';
import { TransitionMatrixModelDef } from '../types';
import { MinusIcon } from './icons/MinusIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

interface TransitionMatrixEditorProps {
  model: TransitionMatrixModelDef;
  onUpdate: (id: string, updatedModel: Partial<TransitionMatrixModelDef>) => void;
  onDelete: (id: string) => void;
}

export const TransitionMatrixEditor: React.FC<TransitionMatrixEditorProps> = ({ model, onUpdate, onDelete }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleMatrixChange = (rowIndex: number, colIndex: number, value: string) => {
    const newMatrix = model.matrix.map(r => [...r]);
    const numValue = parseFloat(value);
    newMatrix[rowIndex][colIndex] = isNaN(numValue) ? null : numValue;
    onUpdate(model.id, { matrix: newMatrix });
  };
  
  useEffect(() => {
      let error: string | null = null;
      model.matrix.forEach((row, i) => {
        const total = row.reduce((sum, val) => sum + (val || 0), 0);
        if (row.some(v => v !== null) && Math.abs(total - 1.0) > 0.0001) {
            error = `Row for state '${model.states[i]}' sums to ${total.toFixed(4)}, but should sum to 1.`;
        }
      });
      if (model.error !== error) {
        onUpdate(model.id, { error });
      }

  }, [model.matrix, model.id, model.states, model.error, onUpdate]);

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
        <div className="p-4 space-y-4">
            <p className="text-sm text-gray-400">Define the probability P(X_t+1 = j | X_t = i). Each row must sum to 1.</p>
            <div className="bg-gray-800 rounded-md text-sm font-mono overflow-x-auto border border-gray-700">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-gray-800 z-10">
                        <tr className="border-b border-gray-600">
                        <th className="p-3 font-semibold">From \ To</th>
                        {model.states.map((s) => (
                            <th key={String(s)} className="p-3 font-semibold text-center">{String(s)}</th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {model.matrix.map((row, i) => (
                            <tr key={i} className="border-b border-gray-700 last:border-b-0">
                                <th className="p-3 font-semibold bg-gray-800 sticky left-0">{String(model.states[i])}</th>
                                {row.map((prob, j) => (
                                <td key={j} className="p-2">
                                     <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="1"
                                      value={prob ?? ''}
                                      onChange={(e) => handleMatrixChange(i, j, e.target.value)}
                                      placeholder="0.0"
                                      className="w-full p-1 bg-gray-900 text-gray-300 border border-gray-600 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                    />
                                </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {model.error && <p className="text-sm text-red-400 bg-red-900/30 p-2 rounded-md">{model.error}</p>}
        </div>
      )}
    </div>
  );
};
