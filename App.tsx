import React, { useState, useCallback, useMemo } from 'react';
import { DataInput } from './components/DataInput';
import { ModelsManager } from './components/ModelsManager';
import { ResultsDisplay } from './components/ResultsDisplay';
import { getAnalysisExplanation } from './services/geminiService';
import { AnalysisResult, AnalysisMode } from './types';
import { TransitionMatrixModelsManager } from './components/TransitionMatrixModelsManager';
import { TrashIcon } from './components/icons/TrashIcon';
import { SessionManager } from './components/SessionManager';
import { VariableTypeModal } from './components/VariableTypeModal';
import { useStochasticState } from './hooks/useStochasticState';
import { useSessionManager } from './hooks/useSessionManager';

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


function App() {
  const {
    stagedCsvString,
    setStagedCsvString,
    parsedData,
    variableInfo,
    models,
    setModels,
    transitionMatrixModels,
    setTransitionMatrixModels,
    analysisMode,
    isEnsemble,
    isTypeModalOpen,
    pendingVariableInfo,
    saveStatus,
    handleDataSubmit,
    handleTypeConfirmation,
    handleCancelTypeConfirmation,
    resetToExample,
  } = useStochasticState(exampleData);

  const {
    savedSessions,
    handleSaveSession,
    handleLoadSession,
    handleDeleteSession,
    handleImportSessions,
    clearAllSessions
  } = useSessionManager({
    onLoad: (sessionData) => {
        setStagedCsvString(sessionData.submittedCsvString);
        // Directly update the state without going through the modal again
        const {_stagedCsvString, ...stateToLoad} = sessionData;
        
        // This is a simplified load; a more robust solution might merge states.
        // For now, directly setting the loaded state.
        if(stateToLoad.submittedCsvString) {
          setStagedCsvString(stateToLoad.submittedCsvString);
        }
        // ... and other state setters would be called here from useStochasticState
        // This part would need more robust implementation if we were to fully integrate.
        // For now, we'll keep the existing state update logic within useStochasticState.
    }
  });


  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const handleFullReset = () => {
    if (window.confirm("Are you sure you want to clear all data, saved sessions, and reset to the default example? This action cannot be undone.")) {
      clearAllSessions();
      resetToExample();
      setAnalysisResult(null);
      setExplanation(null);
      setError(null);
    }
  };


  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setExplanation(null);

    try {
      if (parsedData.rows.length === 0) {
        throw new Error("No data provided to analyze.");
      }
      
      const { analyzeStochasticProcess } = await import('./services/stochasticService');
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
        onCancel={handleCancelTypeConfirmation}
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
                    onClick={handleFullReset} 
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
