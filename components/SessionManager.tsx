import React, { useState, useRef, useEffect } from 'react';
import { SaveIcon } from './icons/SaveIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface SessionManagerProps {
  savedSessions: Record<string, any>;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onImport: (jsonData: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ savedSessions, onSave, onLoad, onDelete, onImport }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

    const handleExport = () => {
        if (sessionKeys.length === 0) {
            alert("No sessions to export.");
            return;
        }
        const dataStr = JSON.stringify(savedSessions, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'stochastic_sessions.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsOpen(false);
    };

    const handleImportChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    onImport(text);
                }
                if (fileInputRef.current) {
                    fileInputRef.current.value = ''; // Reset input to allow re-importing the same file
                }
            };
            reader.readAsText(file);
            setIsOpen(false);
        }
    };
    
    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs bg-gray-700 hover:bg-gray-600 p-2 rounded transition-colors flex items-center gap-1.5"
            >
                <FolderOpenIcon className="w-4 h-4" />
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveClick()}
                                placeholder="Enter session name..."
                                className="w-full p-2 bg-gray-900 text-gray-300 border border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            />
                            <button 
                                onClick={handleSaveClick}
                                disabled={!newSessionName.trim()}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold p-2 rounded-md transition-colors"
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
                    <div className="p-2 border-t border-gray-600 flex gap-2 bg-gray-800 rounded-b-lg">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportChange}
                            accept=".json,application/json"
                            className="hidden"
                            id="import-sessions-input"
                        />
                        <label htmlFor="import-sessions-input" className="cursor-pointer text-xs w-full bg-gray-700 hover:bg-gray-600 p-2 rounded transition-colors flex items-center justify-center gap-1.5">
                            <UploadIcon className="w-4 h-4" />
                            Import
                        </label>
                        <button
                            onClick={handleExport}
                            className="text-xs w-full bg-gray-700 hover:bg-gray-600 p-2 rounded transition-colors flex items-center justify-center gap-1.5"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};