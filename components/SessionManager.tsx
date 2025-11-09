import React, { useState, useRef, useEffect } from 'react';
import { SaveIcon } from './icons/SaveIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';

interface SessionManagerProps {
  savedSessions: Record<string, any>;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ savedSessions, onSave, onLoad, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const sessionKeys = Object.keys(savedSessions);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveClick = () => {
        onSave(newSessionName);
        setNewSessionName('');
        setIsOpen(false);
    }
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs bg-gray-700 hover:bg-gray-600 p-2 rounded transition-colors flex items-center gap-1.5"
            >
                <SaveIcon className="w-4 h-4" />
                Sessions
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-30">
                    <div className="p-3 space-y-2">
                        <label className="text-sm font-semibold text-gray-300">Save Current Session</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSessionName}
                                onChange={(e) => setNewSessionName(e.target.value)}
                                placeholder="Enter session name..."
                                className="w-full p-2 bg-gray-900 text-gray-300 border border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            />
                            <button 
                                onClick={handleSaveClick}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-md transition-colors"
                                title="Save Session"
                            >
                                <SaveIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    {sessionKeys.length > 0 && (
                        <>
                            <hr className="border-gray-600"/>
                            <div className="p-3 max-h-60 overflow-y-auto">
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Saved Sessions</h4>
                                <ul className="space-y-2">
                                    {sessionKeys.map(name => (
                                        <li key={name} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-md">
                                            <span className="text-sm text-gray-300 truncate" title={name}>{name}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => { onLoad(name); setIsOpen(false); }} title="Load Session" className="p-1 text-gray-400 hover:text-green-400"><FolderOpenIcon className="w-5 h-5"/></button>
                                                <button 
                                                    onClick={() => onDelete(name)} 
                                                    title="Delete Session" 
                                                    className="p-1 text-gray-400 hover:text-red-400">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};