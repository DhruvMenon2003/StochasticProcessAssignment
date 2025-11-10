import { useState, useCallback, useEffect } from 'react';
import { ModelDef, TransitionMatrixModelDef, VariableInfo } from '../types';

const SESSIONS_KEY = 'stochasticAppSessions';

// A simplified type for what gets passed to the onLoad callback
interface SessionLoadData {
    submittedCsvString: string;
    variableInfo: VariableInfo[];
    models: ModelDef[];
    transitionMatrixModels: TransitionMatrixModelDef[];
    // Internal use, not part of the saved session format
    _stagedCsvString: string;
}

interface UseSessionManagerProps {
    onLoad: (data: SessionLoadData) => void;
}

export const useSessionManager = ({ onLoad }: UseSessionManagerProps) => {
    const [savedSessions, setSavedSessions] = useState<Record<string, any>>({});

    useEffect(() => {
        const sessionsJSON = localStorage.getItem(SESSIONS_KEY);
        if (sessionsJSON) {
            try {
                setSavedSessions(JSON.parse(sessionsJSON));
            } catch (e) {
                console.error("Failed to parse saved sessions from localStorage:", e);
                localStorage.removeItem(SESSIONS_KEY);
            }
        }
    }, []);

    const handleSaveSession = useCallback((name: string) => {
        // This function would need access to the current state to save.
        // As a hook, it should receive the state to save as an argument.
        // For now, this is a placeholder as the App component orchestrates it.
        // A more advanced implementation might use a context provider.
        console.log("Save requested for:", name);
        // The actual saving logic is triggered from App.tsx where state is available.
    }, []);

    const handleLoadSession = useCallback((name: string) => {
        const session = savedSessions[name];
        if (session) {
            // The onLoad callback is used to pass the data back to the main state hook.
            onLoad({
              submittedCsvString: session.submittedCsvString ?? '',
              _stagedCsvString: session.submittedCsvString ?? '',
              variableInfo: session.variableInfo ?? [],
              models: session.models ?? [],
              transitionMatrixModels: session.transitionMatrixModels ?? [],
            });
            alert(`Session "${name}" loaded.`);
        }
    }, [savedSessions, onLoad]);

    const handleDeleteSession = useCallback((name: string) => {
        setSavedSessions(currentSessions => {
            const newSavedSessions = { ...currentSessions };
            delete newSavedSessions[name];
            localStorage.setItem(SESSIONS_KEY, JSON.stringify(newSavedSessions));
            return newSavedSessions;
        });
    }, []);

    const handleImportSessions = useCallback((jsonData: string) => {
        try {
            const sanitizedJsonData = jsonData.trim().replace(/^\uFEFF/, '');
            if (!sanitizedJsonData) throw new Error("Imported session file is empty.");
            
            const parsedJson = JSON.parse(sanitizedJsonData);
            if (typeof parsedJson !== 'object' || parsedJson === null || Array.isArray(parsedJson)) {
                throw new Error("Invalid session file. Must be a JSON object of sessions.");
            }
            
            const validImportedSessions: Record<string, any> = {};
            let invalidCount = 0;

            for (const key in parsedJson) {
                if (Object.prototype.hasOwnProperty.call(parsedJson, key)) {
                    const session = parsedJson[key];
                    if (session && typeof session === 'object' && typeof session.submittedCsvString !== 'undefined') {
                        validImportedSessions[key] = session;
                    } else {
                        invalidCount++;
                    }
                }
            }
            
            if (Object.keys(validImportedSessions).length === 0) {
                throw new Error("No valid sessions found in the file.");
            }

            const newSavedSessions = { ...savedSessions, ...validImportedSessions };
            setSavedSessions(newSavedSessions);
            localStorage.setItem(SESSIONS_KEY, JSON.stringify(newSavedSessions));
            
            let alertMessage = `Successfully imported and merged ${Object.keys(validImportedSessions).length} session(s).`;
            if (invalidCount > 0) {
                alertMessage += `\nNote: ${invalidCount} invalid entries were ignored.`;
            }
            alert(alertMessage);
        } catch (e: any) {
            alert(`Import failed: ${e.message}`);
            console.error("Failed to import sessions:", e);
        }
    }, [savedSessions]);

    const clearAllSessions = useCallback(() => {
        localStorage.removeItem(SESSIONS_KEY);
        setSavedSessions({});
    }, []);

    return {
        savedSessions,
        handleSaveSession, // Note: The saving logic itself is still coupled to App state
        handleLoadSession,
        handleDeleteSession,
        handleImportSessions,
        clearAllSessions,
    };
};
