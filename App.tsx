import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { ModelsManager } from './components/ModelsManager';
import { ResultsDisplay } from './components/ResultsDisplay';
import { parseCsvData, detectAnalysisMode, analyzeCsvStructure } from './utils/csvParser';
import { analyzeStochasticProcess } from './services/stochasticService';
import { getAnalysisExplanation } from './services/geminiService';
import { CsvData, VariableInfo, ModelDef, AnalysisResult, AnalysisMode, TransitionMatrixModelDef } from './types';
import { TransitionMatrixModelsManager } from './components/TransitionMatrixModelsManager';
import { TrashIcon } from './components/icons/TrashIcon';
import { SessionManager } from './components/SessionManager';
import { VariableTypeModal } from './components/VariableTypeModal';

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

const exampleEnsembleData = `Time,Instance1,Instance2,Instance3,Instance4,Instance5
Day1,1,2,1,3,1
Day2,1,3,2,3,2
Day3,2,3,2,1,2
Day4,3,1,1,1,3`;

const AUTOSAVE_KEY = 'stochasticAppAutosave';
const SESSIONS_KEY = 'stochasticAppSessions';

function App() {
  const [stagedCsvString, setStagedCsvString] = useState<string>(exampleData);
  const [submittedCsvString, setSubmittedCsvString] = useState<string>(exampleData);

  const [models, setModels] = useState<ModelDef[]>([]);
  const [transitionMatrixModels, setTransitionMatrixModels] = useState<TransitionMatrixModelDef[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedSessions, setSavedSessions] = useState<Record<string, any>>({});

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [pendingVariableInfo, setPendingVariableInfo] = useState<VariableInfo[]>([]);
  const [variableInfo, setVariableInfo] = useState<VariableInfo[]>([]);

  // Effect to load data from localStorage on initial render
  useEffect(() => {
    // Load autosaved state
    const savedStateJSON = localStorage.getItem(AUTOSAVE_KEY);
    if (savedStateJSON) {
      try {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.submittedCsvString) {
            setSubmittedCsvString(savedState.submittedCsvString);
            setStagedCsvString(savedState.submittedCsvString);
        }
        if (savedState.variableInfo) setVariableInfo(savedState.variableInfo);
        if (savedState.models) setModels(savedState.models);
        if (savedState.transitionMatrixModels) setTransitionMatrixModels(savedState.transitionMatrixModels);
      } catch (e) {
        console.error("Failed to parse saved state from localStorage:", e);
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    } else {
        // If no saved state, initialize with example data
        const initialParsed = parseCsvData(exampleData);
        setVariableInfo(analyzeCsvStructure(initialParsed));
    }
     // Load saved sessions
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

  // Effect to auto-save data to localStorage with debouncing
  useEffect(() => {
    setSaveStatus('saving');
    const handler = setTimeout(() => {
      try {
        const stateToSave = {
          submittedCsvString,
          variableInfo,
          models,
          transitionMatrixModels,
        };
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(stateToSave));
        setSaveStatus('saved');
        
        const resetHandler = setTimeout(() => setSaveStatus('idle'), 2000);
        return () => clearTimeout(resetHandler);

      } catch (e) {
        console.error("Failed to save state to localStorage:", e);
        setSaveStatus('idle');
      }
    }, 1000); // Debounce for 1 second

    return () => {
      clearTimeout(handler);
    };
  }, [submittedCsvString, variableInfo, models, transitionMatrixModels]);

  const parsedData = useMemo<CsvData>(() => {
    try {
      return parseCsvData(submittedCsvString);
    } catch (e) {
      console.error("CSV parsing error:", e);
      return { headers: [], rows: [] };
    }
  }, [submittedCsvString]);

  const analysisMode = useMemo(() => detectAnalysisMode(parsedData), [parsedData]);
  const isEnsemble = analysisMode === 'timeSeriesEnsemble';
  
  const variableInfoString = useMemo(() => JSON.stringify(variableInfo), [variableInfo]);

  // Effect to intelligently sync or reset models when the underlying data structure changes.
  useEffect(() => {
    const newVarInfoMap = new Map(variableInfo.map(v => [v.name, v]));

    setModels(prevModels => {
        if (variableInfo.length === 0) {
            return [];
        }
    
        return prevModels.map(model => {
            const validModelVars = (model.variables || []).filter(v => v && typeof v === 'object') as VariableInfo[];
            const modelVarMap = new Map(validModelVars.map(v => [v.name, v]));
            
            const modelVarNames = new Set(validModelVars.map(v => v.name));
            const newVarNames = new Set(variableInfo.map(v => v.name));
            const areVarSetsEqual = modelVarNames.size === newVarNames.size && [...modelVarNames].every(name => newVarNames.has(name));

            let probabilitiesNeedReset = !areVarSetsEqual;

            const syncedVariables = variableInfo.map(newInfoFromData => {
                const existingModelVar = modelVarMap.get(newInfoFromData.name);

                if (existingModelVar) {
                    if (existingModelVar.states !== newInfoFromData.states) {
                        probabilitiesNeedReset = true;
                    }
                    return {
                        ...existingModelVar,
                        states: newInfoFromData.states,
                    };
                } else {
                    return JSON.parse(JSON.stringify(newInfoFromData));
                }
            });
            
            if (JSON.stringify(model.variables) === JSON.stringify(syncedVariables)) {
                return model;
            }

            return {
                ...model,
                variables: syncedVariables,
                probabilities: probabilitiesNeedReset ? {} : model.probabilities,
                error: null,
            };
        });
    });
    
  }, [variableInfoString]);

  const handleDataSubmit = useCallback(() => {
    try {
        const data = parseCsvData(stagedCsvString);
        if (data.headers.length === 0 || data.rows.length === 0) {
            alert("The submitted CSV data is empty or invalid. Please provide data with a header row.");
            return;
        }
        const initialVarInfo = analyzeCsvStructure(data);
        setPendingVariableInfo(initialVarInfo);
        setIsTypeModalOpen(true);
    } catch (e: any) {
        alert(`Error parsing CSV: ${e.message}`);
    }
  }, [stagedCsvString]);

  const handleTypeConfirmation = useCallback((confirmedInfo: VariableInfo[]) => {
      setVariableInfo(confirmedInfo);
      setSubmittedCsvString(stagedCsvString);
      // Reset models and results for a clean slate with the new data structure
      setModels([]);
      setTransitionMatrixModels([]);
      setAnalysisResult(null);
      setExplanation(null);
      setError(null);
      setIsTypeModalOpen(false);
  }, [stagedCsvString]);


  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setExplanation(null);

    try {
      if (parsedData.rows.length === 0) {
        throw new Error("No data provided to analyze.");
      }
      
      const results = analyzeStochasticProcess(parsedData, models, transitionMatrixModels, analysisMode, variableInfo);
      setAnalysisResult(results);
      
      const geminiExplanation = await getAnalysisExplanation(results);
      setExplanation(geminiExplanation);

    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during analysis.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, models, transitionMatrixModels, analysisMode, variableInfo]);

  const handleSaveSession = useCallback((name: string) => {
    if (!name.trim()) {
        alert("Please enter a valid session name.");
        return;
    }
    const stateToSave = {
      submittedCsvString,
      variableInfo,
      models,
      transitionMatrixModels,
      savedAt: new Date().toISOString(),
    };
    const newSavedSessions = { ...savedSessions, [name]: stateToSave };
    setSavedSessions(newSavedSessions);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(newSavedSessions));
    alert(`Session "${name}" saved.`);
  }, [submittedCsvString, variableInfo, models, transitionMatrixModels, savedSessions]);

  const handleLoadSession = useCallback((name: string) => {
    const session = savedSessions[name];
    if (session) {
      setSubmittedCsvString(session.submittedCsvString ?? '');
      setStagedCsvString(session.submittedCsvString ?? '');
      setVariableInfo(session.variableInfo ?? []);
      setModels(session.models ?? []);
      setTransitionMatrixModels(session.transitionMatrixModels ?? []);
      setAnalysisResult(null);
      setExplanation(null);
      setError(null);
      alert(`Session "${name}" loaded.`);
    }
  }, [savedSessions]);

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
      
      if (!sanitizedJsonData) {
          throw new Error("Imported session file is empty.");
      }
      
      const parsedJson = JSON.parse(sanitizedJsonData);
      if (typeof parsedJson !== 'object' || parsedJson === null || Array.isArray(parsedJson)) {
        throw new Error("Invalid session file. Must be a JSON object of sessions.");
      }
      
      const validImportedSessions: Record<string, any> = {};
      let invalidCount = 0;

      for (const key in parsedJson) {
          if (Object.prototype.hasOwnProperty.call(parsedJson, key)) {
              const session = parsedJson[key];
              // A simple but effective check: does it look like a session object?
              // It must be an object and contain the 'submittedCsvString' key.
              if (session && typeof session === 'object' && typeof session.submittedCsvString !== 'undefined') {
                  validImportedSessions[key] = session;
              } else {
                  invalidCount++;
              }
          }
      }
      
      const validCount = Object.keys(validImportedSessions).length;

      if (validCount === 0) {
          throw new Error("No valid sessions found in the file. Please ensure the JSON structure matches the session format (e.g., contains 'submittedCsvString').");
      }

      const newSavedSessions = { ...savedSessions, ...validImportedSessions };
      setSavedSessions(newSavedSessions);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(newSavedSessions));
      
      let alertMessage = `Successfully imported and merged ${validCount} session(s).`;
      if (invalidCount > 0) {
          alertMessage += `\nNote: ${invalidCount} invalid entries were found and ignored.`;
      }
      alert(alertMessage);

    } catch (e: any) {
      alert(`Import failed: ${e.message}`);
      console.error("Failed to import sessions:", e);
    }
  }, [savedSessions]);


  const handleClearAndReset = () => {
    if (window.confirm("Are you sure you want to clear all data, saved sessions, and reset to the default example? This action cannot be undone.")) {
      localStorage.removeItem(AUTOSAVE_KEY);
      localStorage.removeItem(SESSIONS_KEY);
      const initialParsed = parseCsvData(exampleData);
      setStagedCsvString(exampleData);
      setSubmittedCsvString(exampleData);
      setVariableInfo(analyzeCsvStructure(initialParsed));
      setModels([]);
      setTransitionMatrixModels([]);
      setSavedSessions({});
      setAnalysisResult(null);
      setExplanation(null);
      setError(null);
      setSaveStatus('idle');
    }
  };

  const modeDisplayNames: Record<AnalysisMode, string> = {
    joint: "Cross-Sectional",
    timeSeries: "Time Series (Single Trace)",
    timeSeriesEnsemble: "Time Series (Ensemble)"
  };

  const modeDescriptions: Record<AnalysisMode, string> = {
      joint: "Each row is treated as an independent observation.",
      timeSeries: "'Time' column detected. Each row is treated as a sequential time step.",
      timeSeriesEnsemble: "Ensemble format ('Time', 'Instance1'...) detected."
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <VariableTypeModal
        isOpen={isTypeModalOpen}
        initialVariables={pendingVariableInfo}
        onConfirm={handleTypeConfirmation}
        onCancel={() => setIsTypeModalOpen(false)}
      />
      <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
              Stochastic Process Analyzer
            </h1>
             <div className="flex items-center gap-4">
                <SessionManager
                  savedSessions={savedSessions}
                  onSave={handleSaveSession}
                  onLoad={handleLoadSession}
                  onDelete={handleDeleteSession}
                  onImport={handleImportSessions}
                />
                <button onClick={() => setStagedCsvString(exampleEnsembleData)} className="text-xs bg-gray-700 hover:bg-gray-600 p-2 rounded transition-colors">Load Ensemble Example</button>
                <button 
                    onClick={handleClearAndReset} 
                    className="text-xs flex items-center gap-1.5 bg-red-800/50 hover:bg-red-700/50 p-2 rounded text-red-300 transition-colors" 
                    title="Clear saved data and reset"
                >
                    <TrashIcon className="h-4 w-4" />
                    Clear & Reset
                </button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <DataInput 
              value={stagedCsvString} 
              onChange={setStagedCsvString}
              onSubmit={handleDataSubmit}
            />
            {isEnsemble ? (
                <TransitionMatrixModelsManager
                    models={transitionMatrixModels}
                    setModels={setTransitionMatrixModels}
                    states={variableInfo.length > 0 ? variableInfo[0].states.split(',').map(s=>s.trim()).filter(Boolean) : []}
                />
            ) : (
                <ModelsManager models={models} setModels={setModels} variableInfo={variableInfo} />
            )}
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">Run Analysis</h2>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Analysis Mode</label>
                         <div className="bg-gray-900 border border-gray-600 text-blue-300 text-sm rounded-lg block w-full p-2.5">
                            {modeDisplayNames[analysisMode]} <span className="text-gray-500">- Auto-detected from submitted data</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {modeDescriptions[analysisMode]}
                        </p>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={isLoading || parsedData.rows.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                    >
                      {isLoading ? 'Analyzing...' : 'Analyze'}
                    </button>
                     <div className="text-center text-sm h-5 text-gray-500 transition-opacity duration-500">
                        {saveStatus === 'saving' && <span>Saving...</span>}
                        {saveStatus === 'saved' && <span className="text-green-400">✓ Saved</span>}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12">
           <ResultsDisplay 
              isLoading={isLoading}
              error={error}
              results={analysisResult}
              explanation={explanation}
              mode={analysisMode}
            />
        </div>
      </main>
    </div>
  );
}

export default App;