import React, { useState, useEffect, useCallback } from 'react';
import { DataInput } from './components/DataInput';
import { ModelsManager } from './components/ModelsManager';
import { AnalysisOptions } from './components/AnalysisOptions';
import { ResultsDisplay } from './components/ResultsDisplay';
import { parseCsvData, isTimeSeriesEnsemble } from './utils/csvParser';
import { performAnalysis } from './services/stochasticService';
import { getAnalysisExplanation } from './services/geminiService';
import { CsvData, AnalysisResult, ModelDef, AnalysisOptions as AnalysisOptionsType, AnalysisMode, VariableDef, TransitionMatrixModelDef } from './types';
import { TransitionMatrixModelsManager } from './components/TransitionMatrixModelsManager';

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

const App: React.FC = () => {
  const [data, setData] = useState<string>(exampleData);
  const [parsedData, setParsedData] = useState<CsvData | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('cross-sectional');
  const [models, setModels] = useState<ModelDef[]>([]);
  const [tmModels, setTmModels] = useState<TransitionMatrixModelDef[]>([]);
  const [templateVariables, setTemplateVariables] = useState<VariableDef[]>([]);
  const [ensembleStates, setEnsembleStates] = useState<(string|number)[]>([]);

  const [options, setOptions] = useState<AnalysisOptionsType>({ runMarkovOrderTest: false });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      const pData = parseCsvData(data);
      setParsedData(pData);
      
      if (isTimeSeriesEnsemble(pData)) {
          setAnalysisMode('time-series-ensemble');
          const states = Array.from(new Set(pData.rows.flatMap(row => row.slice(1))));
          setEnsembleStates(states);
      } else if (pData.headers.length > 0 && pData.headers[0].toLowerCase() === 'time') {
          setAnalysisMode('time-series');
      } else {
          setAnalysisMode('cross-sectional');
      }
      
      const newVars = pData.headers.map(h => ({ name: h, states: '' }));
      setTemplateVariables(newVars);

    } catch (e) {
      setError("Failed to parse CSV data.");
      setParsedData(null);
    }
  }, [data]);
  
  useEffect(() => {
      if(analysisMode === 'time-series' || analysisMode === 'time-series-ensemble') {
          setOptions({ runMarkovOrderTest: true });
      } else {
          setOptions({ runMarkovOrderTest: false });
      }
  }, [analysisMode]);

  const handleAnalyze = useCallback(async () => {
    if (!parsedData) {
      setError("No data to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);
    setExplanation(null);

    try {
      const analysisResults = performAnalysis(parsedData, models, tmModels, options, analysisMode);
      setResults(analysisResults);
      
      const geminiExplanation = await getAnalysisExplanation(analysisResults);
      setExplanation(geminiExplanation);

    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during analysis.");
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, models, tmModels, options, analysisMode]);

  const isAnalysisDisabled = !parsedData || parsedData.rows.length === 0 || models.some(m => m.error) || tmModels.some(m => m.error);

  const AnalysisManager = () => {
    if (analysisMode === 'time-series-ensemble') {
        return <TransitionMatrixModelsManager models={tmModels} setModels={setTmModels} states={ensembleStates} />
    }
    return <ModelsManager models={models} setModels={setModels} templateVariables={templateVariables} />;
  }

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
            Stochastic Process Analyzer
          </h1>
          <button
            onClick={handleAnalyze}
            disabled={isAnalysisDisabled || isLoading}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <DataInput value={data} onChange={setData} />
            <AnalysisManager />
            {(analysisMode === 'time-series' || analysisMode === 'time-series-ensemble') &&
                <AnalysisOptions options={options} setOptions={setOptions} disabled={true}/>
            }
          </div>
          <div className="sticky top-24">
            <ResultsDisplay
              isLoading={isLoading}
              error={error}
              results={results}
              explanation={explanation}
              mode={analysisMode}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
