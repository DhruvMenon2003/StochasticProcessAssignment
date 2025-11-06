
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { ModelsManager } from './components/ModelsManager';
import { AnalysisOptions } from './components/AnalysisOptions';
import { ResultsDisplay } from './components/ResultsDisplay';
import { parseCsvData } from './utils/csvParser';
import { analyzeStochasticProcess } from './services/stochasticService';
import { getAnalysisExplanation } from './services/geminiService';
import { CsvData, VariableDef, ModelDef, AnalysisOptions as AnalysisOptionsType, AnalysisResult, AnalysisMode } from './types';

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

function App() {
  const [csvString, setCsvString] = useState<string>(exampleData);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('timeSeries');
  const [models, setModels] = useState<ModelDef[]>([]);
  const [options, setOptions] = useState<AnalysisOptionsType>({
    runMarkovOrderTest: false,
    runTimeHomogeneityTest: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const parsedData = useMemo<CsvData>(() => {
    try {
      return parseCsvData(csvString);
    } catch (e) {
      console.error("CSV parsing error:", e);
      return { headers: [], rows: [] };
    }
  }, [csvString]);

  const templateVariables = useMemo<VariableDef[]>(() => {
    if (parsedData.headers.length === 0) return [];
    
    // Infer states from data
    const uniqueStates: { [key: string]: Set<string | number> } = {};
    parsedData.headers.forEach(h => {
      uniqueStates[h] = new Set();
    });

    const headerIndexMap = new Map(parsedData.headers.map((h, i) => [h, i]));

    parsedData.rows.forEach(row => {
      parsedData.headers.forEach(h => {
        const index = headerIndexMap.get(h);
        if (index !== undefined && row[index] !== undefined && row[index] !== '') {
          uniqueStates[h].add(row[index]);
        }
      });
    });

    return parsedData.headers.map(h => ({
      name: h,
      states: Array.from(uniqueStates[h]).sort().join(', '),
    }));

  }, [parsedData]);
  
  // Reset models if headers change
  useEffect(() => {
     setModels([]);
  }, [templateVariables.map(v => v.name).join(',')]);


  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setExplanation(null);

    try {
      if (parsedData.rows.length === 0) {
        throw new Error("No data provided to analyze.");
      }
      
      const results = analyzeStochasticProcess(parsedData, models, analysisMode, options);
      setAnalysisResult(results);
      
      const geminiExplanation = await getAnalysisExplanation(results);
      setExplanation(geminiExplanation);

    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during analysis.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, models, analysisMode, options]);

  const isTimeSeries = analysisMode !== 'joint';

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
              Stochastic Process Analyzer
            </h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <DataInput value={csvString} onChange={setCsvString} />
            <ModelsManager models={models} setModels={setModels} templateVariables={templateVariables} />
            {isTimeSeries && (
                <AnalysisOptions options={options} setOptions={setOptions} disabled={analysisMode==='timeSeriesEnsemble'}/>
            )}
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">Run Analysis</h2>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Analysis Mode</label>
                        <select 
                            value={analysisMode} 
                            onChange={(e) => setAnalysisMode(e.target.value as AnalysisMode)}
                            className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        >
                            <option value="timeSeries">Time Series (Single Trace)</option>
                            <option value="joint">Joint Distribution (Cross-sectional)</option>
                            {/* <option value="timeSeriesEnsemble">Time Series (Ensemble)</option> */}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {analysisMode === 'timeSeries' ? 'Data is a single sequence over time.' : 'Each row is an independent observation.'}
                        </p>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={isLoading || parsedData.rows.length === 0}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                    >
                      {isLoading ? 'Analyzing...' : 'Analyze'}
                    </button>
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
