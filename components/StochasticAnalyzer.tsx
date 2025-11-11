import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Calculator, PlayCircle, CheckCircle, TrendingUp, BarChart3, Info, Save, FolderOpen, Download, Trash2 } from 'lucide-react';
import { parseCsvData, analyzeCsvStructure } from '../utils/csvParser';
import { VariableInfo, ModelDef, CsvData } from '../types';
import { VariableTypeModal } from './VariableTypeModal';

const SESSIONS_KEY = 'stochasticAnalyzerSessions';
const AUTOSAVE_KEY = 'stochasticAnalyzerAutosave';

interface Session {
  csvData: string;
  variableInfo: VariableInfo[];
  models: ModelDef[];
  timestamp: number;
}

const StochasticAnalyzer = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [csvData, setCsvData] = useState('');
  const [parsedData, setParsedData] = useState<CsvData>({ headers: [], rows: [] });
  const [variableInfo, setVariableInfo] = useState<VariableInfo[]>([]);
  const [models, setModels] = useState<ModelDef[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Session management
  const [savedSessions, setSavedSessions] = useState<Record<string, Session>>({});
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const sessionMenuRef = useRef<HTMLDivElement>(null);

  // Variable type modal
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [pendingVariableInfo, setPendingVariableInfo] = useState<VariableInfo[]>([]);

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

  const steps = [
    { num: 1, title: 'Upload Data', icon: Upload },
    { num: 2, title: 'Define Models', icon: Calculator },
    { num: 3, title: 'Run Analysis', icon: PlayCircle },
  ];

  // Load saved sessions on mount
  useEffect(() => {
    const sessionsJSON = localStorage.getItem(SESSIONS_KEY);
    if (sessionsJSON) {
      try {
        setSavedSessions(JSON.parse(sessionsJSON));
      } catch (e) {
        console.error('Failed to parse saved sessions:', e);
      }
    }

    // Load autosave
    const autosaveJSON = localStorage.getItem(AUTOSAVE_KEY);
    if (autosaveJSON) {
      try {
        const autosave = JSON.parse(autosaveJSON);
        setCsvData(autosave.csvData || '');
        setVariableInfo(autosave.variableInfo || []);
        setModels(autosave.models || []);
        if (autosave.csvData) {
          const parsed = parseCsvData(autosave.csvData);
          setParsedData(parsed);
        }
      } catch (e) {
        console.error('Failed to load autosave:', e);
      }
    }
  }, []);

  // Autosave whenever data changes
  useEffect(() => {
    if (csvData || variableInfo.length > 0 || models.length > 0) {
      const autosave = {
        csvData,
        variableInfo,
        models,
        timestamp: Date.now(),
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(autosave));
    }
  }, [csvData, variableInfo, models]);

  // Handle click outside session menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(event.target as Node)) {
        setSessionMenuOpen(false);
      }
    };

    if (sessionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sessionMenuOpen]);

  const handleDataSubmit = useCallback(() => {
    if (!csvData.trim()) return;

    const parsed = parseCsvData(csvData);
    setParsedData(parsed);

    const detectedVariables = analyzeCsvStructure(parsed);
    setPendingVariableInfo(detectedVariables);
    setIsTypeModalOpen(true);
  }, [csvData]);

  const handleTypeConfirmation = useCallback((confirmedVariables: VariableInfo[]) => {
    setVariableInfo(confirmedVariables);
    setIsTypeModalOpen(false);
    setActiveStep(2);

    // Initialize a default uniform model with the confirmed variables
    const defaultModel: ModelDef = {
      id: 'uniform-' + Date.now(),
      name: 'Uniform Distribution',
      variables: confirmedVariables,
      probabilities: {},
      error: null,
      modelString: '',
    };
    setModels([defaultModel]);
  }, []);

  const handleCancelTypeConfirmation = useCallback(() => {
    setIsTypeModalOpen(false);
    setPendingVariableInfo([]);
  }, []);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResults({
        bestModel: 'Uniform Distribution',
        hellinger: 0.0234,
        accuracy: 94.2,
        variables: variableInfo.map(v => v.name)
      });
      setActiveStep(3);
    }, 2000);
  };

  // Session Management Functions
  const handleSaveSession = useCallback(() => {
    if (!newSessionName.trim()) {
      alert('Please enter a session name');
      return;
    }

    const session: Session = {
      csvData,
      variableInfo,
      models,
      timestamp: Date.now(),
    };

    const updated = { ...savedSessions, [newSessionName]: session };
    setSavedSessions(updated);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
    setNewSessionName('');
    alert(`Session "${newSessionName}" saved successfully!`);
  }, [newSessionName, csvData, variableInfo, models, savedSessions]);

  const handleLoadSession = useCallback((name: string) => {
    const session = savedSessions[name];
    if (session) {
      setCsvData(session.csvData);
      setVariableInfo(session.variableInfo);
      setModels(session.models);
      const parsed = parseCsvData(session.csvData);
      setParsedData(parsed);
      setActiveStep(session.variableInfo.length > 0 ? 2 : 1);
      alert(`Session "${name}" loaded successfully!`);
    }
  }, [savedSessions]);

  const handleDeleteSession = useCallback((name: string) => {
    if (confirm(`Are you sure you want to delete session "${name}"?`)) {
      const updated = { ...savedSessions };
      delete updated[name];
      setSavedSessions(updated);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
    }
  }, [savedSessions]);

  const handleExportSessions = useCallback(() => {
    if (Object.keys(savedSessions).length === 0) {
      alert('No sessions to export');
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
  }, [savedSessions]);

  const handleImportSessions = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const imported = JSON.parse(text);

        if (typeof imported !== 'object') {
          throw new Error('Invalid session file format');
        }

        const merged = { ...savedSessions, ...imported };
        setSavedSessions(merged);
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(merged));
        alert(`Successfully imported ${Object.keys(imported).length} session(s)!`);
      } catch (error) {
        alert('Failed to import sessions. Please check the file format.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }, [savedSessions]);

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all data and sessions? This cannot be undone.')) {
      setCsvData('');
      setVariableInfo([]);
      setModels([]);
      setParsedData({ headers: [], rows: [] });
      setResults(null);
      setActiveStep(1);
      localStorage.removeItem(AUTOSAVE_KEY);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <VariableTypeModal
        isOpen={isTypeModalOpen}
        initialVariables={pendingVariableInfo}
        onConfirm={handleTypeConfirmation}
        onCancel={handleCancelTypeConfirmation}
      />

      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Stochastic Process Analyzer</h1>
                <p className="text-sm text-slate-400">Statistical Analysis & Model Comparison</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCsvData(exampleData)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-all border border-slate-600"
              >
                Load Example
              </button>

              {/* Session Manager */}
              <div className="relative" ref={sessionMenuRef}>
                <button
                  onClick={() => setSessionMenuOpen(!sessionMenuOpen)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-all border border-slate-600 flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Sessions
                </button>

                {sessionMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-2">Save Current Session</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSessionName}
                            onChange={(e) => setNewSessionName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveSession()}
                            placeholder="Enter session name..."
                            className="flex-1 px-3 py-2 bg-slate-900 text-slate-200 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <button
                            onClick={handleSaveSession}
                            disabled={!newSessionName.trim()}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {Object.keys(savedSessions).length > 0 && (
                        <>
                          <hr className="border-slate-600" />
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            <h4 className="text-sm font-semibold text-slate-300">Saved Sessions</h4>
                            {Object.keys(savedSessions).map(name => (
                              <div key={name} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg">
                                <span className="text-sm text-slate-300 truncate flex-1">{name}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleLoadSession(name)}
                                    className="p-1.5 text-slate-400 hover:text-green-400 transition-colors"
                                    title="Load Session"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSession(name)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                                    title="Delete Session"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <hr className="border-slate-600" />
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportSessions}
                            className="hidden"
                          />
                          <div className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm text-center transition-all flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4" />
                            Import
                          </div>
                        </label>
                        <button
                          onClick={handleExportSessions}
                          className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg text-sm font-medium transition-all border border-red-700/50 flex items-center gap-2"
                title="Clear all data"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          {steps.map((step, idx) => (
            <React.Fragment key={step.num}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  activeStep >= step.num
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30'
                    : 'bg-slate-800 border-2 border-slate-600'
                }`}>
                  {activeStep > step.num ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <step.icon className={`w-6 h-6 ${activeStep >= step.num ? 'text-white' : 'text-slate-500'}`} />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Step {step.num}</p>
                  <p className={`text-sm font-semibold ${activeStep >= step.num ? 'text-white' : 'text-slate-400'}`}>
                    {step.title}
                  </p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 transition-all ${
                  activeStep > step.num ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-slate-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Data Input Card */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Input Data</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Info className="w-4 h-4" />
                  <span>CSV format with headers</span>
                </div>
              </div>
              <textarea
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                placeholder="Paste CSV data here..."
                className="w-full h-64 bg-slate-900/50 text-slate-200 border border-slate-600 rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {csvData.split('\n').filter(l => l.trim()).length - 1} rows detected
                </p>
                <button
                  onClick={handleDataSubmit}
                  disabled={!csvData.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition-all shadow-lg disabled:shadow-none"
                >
                  Continue
                </button>
              </div>
            </div>

            {/* Variable Info Display */}
            {variableInfo.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Detected Variables</h3>
                <div className="space-y-2">
                  {variableInfo.map((variable) => (
                    <div key={variable.name} className="bg-slate-900/50 rounded-lg p-3 border border-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{variable.name}</span>
                        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">
                          {variable.type}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1">States: {variable.states}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Models Card */}
            {activeStep >= 2 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Theoretical Models</h3>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">Optional</span>
                </div>
                <div className="space-y-3">
                  {models.map((model) => (
                    <div key={model.id} className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{model.name}</span>
                        <span className="text-xs text-slate-400">
                          {model.variables.length} variable{model.variables.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        Variables: {model.variables.map(v => `${v.name} (${v.type})`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleAnalyze}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all shadow-lg"
                  >
                    Run Analysis
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Info & Results */}
          <div className="space-y-6">
            {/* Analysis Info */}
            <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Analysis Type</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-300 mb-1">Cross-Sectional</p>
                  <p className="text-xs text-slate-400">Independent observations</p>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Each row treated as independent sample. Analyzes joint distributions and marginals.
                </div>
              </div>
            </div>

            {/* Autosave indicator */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Save className="w-4 h-4 text-green-400" />
                <p className="text-xs font-semibold text-slate-400">Auto-save Active</p>
              </div>
              <p className="text-xs text-slate-500">
                Your work is automatically saved to browser storage
              </p>
            </div>

            {/* Results */}
            {analyzing && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl animate-pulse">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <h3 className="text-lg font-bold text-white">Analyzing...</h3>
                </div>
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-3 bg-slate-700 rounded animate-pulse" style={{width: `${60 + i*15}%`}} />
                  ))}
                </div>
              </div>
            )}

            {results && !analyzing && (
              <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-6 shadow-xl animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-bold text-white">Results</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Best Model</p>
                    <p className="text-lg font-bold text-white">{results.bestModel}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Hellinger Dist.</p>
                      <p className="text-xl font-bold text-cyan-400">{results.hellinger}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Fit Quality</p>
                      <p className="text-xl font-bold text-green-400">{results.accuracy}%</p>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all">
                    View Detailed Report
                  </button>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4">
              <p className="text-xs font-semibold text-slate-400 mb-2">Quick Tips</p>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li>• Use comma-separated CSV format</li>
                <li>• Include headers in first row</li>
                <li>• Choose variable types when prompted</li>
                <li>• Save sessions for later use</li>
                <li>• Export/import sessions as JSON files</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StochasticAnalyzer;
