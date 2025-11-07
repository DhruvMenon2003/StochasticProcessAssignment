
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { ModelsManager } from './components/ModelsManager';
import { AnalysisOptions } from './components/AnalysisOptions';
import { ResultsDisplay } from './components/ResultsDisplay';
import { parseCsvData, isTimeSeriesEnsemble } from './utils/csvParser';
import { analyzeStochasticProcess } from './services/stochasticService';
import { getAnalysisExplanation } from './services/geminiService';
import { CsvData, VariableDef, ModelDef, AnalysisOptions as AnalysisOptionsType, AnalysisResult, AnalysisMode, TransitionMatrixModelDef } from './types';
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

const exampleEnsembleData = `Time,Instance1,Instance2,Instance3,Instance4,Instance5
Day1,1,2,1,3,1
Day2,1,3,2,3,2
Day3,2,3,2,1,2
Day4,3,1,1,1,3`;


function App() {
  const [csvString, setCsvString] = useState<string>(exampleData);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('joint');
  const [models, setModels] = useState<ModelDef[]>([]);
  const [transitionMatrixModels, setTransitionMatrixModels] = useState<TransitionMatrixModelDef[]>([]);

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

  const isEnsemble = useMemo(() => isTimeSeriesEnsemble(parsedData), [parsedData]);

  // Auto-switch mode and options based on data format
  useEffect(() => {
    if (isEnsemble) {
      setAnalysisMode('timeSeriesEnsemble');
      setOptions({ runMarkovOrderTest: true, runTimeHomogeneityTest: true });
    } else {
      // If not ensemble, default back to joint or whatever was selected
      if(analysisMode === 'timeSeriesEnsemble') {
          setAnalysisMode('joint');
      }
    }
    // Set default options for regular time series mode
    if (analysisMode === 'timeSeries') {
      setOptions({ runMarkovOrderTest: true, runTimeHomogeneityTest: true });
    } else if (!isEnsemble) {
      setOptions({ runMarkovOrderTest: false, runTimeHomogeneityTest: false });
    }
  }, [isEnsemble, analysisMode]);


  const templateVariables = useMemo<VariableDef[]>(() => {
    if (parsedData.headers.length === 0) return [];
    
    // For ensemble, the variable is implicit, not based on headers
    if(isEnsemble) {
        // FIX: Add explicit type for `row` to prevent `unknown` type inference.
        const allStates = new Set(parsedData.rows.flatMap((row: (string|number)[]) => row.slice(1)));
        return [{
            name: "State",
            states: Array.from(allStates).sort().join(', '),
        }];
    }

    const uniqueStates: { [key: string]: Set<string | number> } = {};
    // FIX: Add explicit types to array method callbacks to prevent `unknown` type inference which can cause indexing errors.
    parsedData.headers.forEach((h: string) => {
      uniqueStates[h] = new Set();
    });

    const headerIndexMap = new Map(parsedData.headers.map((h: string, i: number) => [h, i]));

    parsedData.rows.forEach((row: (string | number)[]) => {
      // FIX: Add explicit types to `forEach` callback parameters to prevent them from being inferred as `unknown`.
      // This resolves "Type 'unknown' cannot be used as an index type" errors.
      parsedData.headers.forEach((h: string) => {
        const index = headerIndexMap.get(h);
        if (index !== undefined && row[index] !== undefined && row[index] !== '') {
          uniqueStates[h].add(row[index]);
        }
      });
    });

    return parsedData.headers.map((h: string) => ({
      name: h,
      states: Array.from(uniqueStates[h]).sort().join(', '),
    }));

  }, [parsedData, isEnsemble]);
  
  // Reset models if headers/data format change
  useEffect(() => {
     setModels([]);
     setTransitionMatrixModels([]);
  }, [templateVariables.map(v => v.name).join(','), isEnsemble]);


  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setExplanation(null);

    try {
      if (parsedData.rows.length === 0) {
        throw new Error("No data provided to analyze.");
      }
      
      const results = analyzeStochasticProcess(parsedData, models, transitionMatrixModels, analysisMode, options);
      setAnalysisResult(results);
      
      const geminiExplanation = await getAnalysisExplanation(results);
      setExplanation(geminiExplanation);

    } catch (e: any) {
      setError(e.message || "An unexpected error occurred during analysis.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [parsedData, models, transitionMatrixModels, analysisMode, options]);

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
      <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
              Stochastic Process Analyzer
            </h1>
             <button onClick={() => setCsvString(exampleEnsembleData)} className="text-xs bg-gray-700 p-1 rounded">Load Ensemble Example</button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <DataInput value={csvString} onChange={setCsvString} />
            {isEnsemble ? (
                <TransitionMatrixModelsManager
                    models={transitionMatrixModels}
                    setModels={setTransitionMatrixModels}
                    states={templateVariables.length > 0 ? templateVariables[0].states.split(',').map(s=>s.trim()).filter(Boolean) : []}
                />
            ) : (
                <ModelsManager models={models} setModels={setModels} templateVariables={templateVariables} />
            )}
            
            {(analysisMode === 'timeSeries' || isEnsemble) && (
                <AnalysisOptions options={options} setOptions={setOptions} disabled={isEnsemble || analysisMode === 'timeSeries'}/>
            )}
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-gray-800/50 p-6 rounded-lg shadow-md border border-gray-700">
                <h2 className="text-2xl font-bold text-gray-100 mb-4">Run Analysis</h2>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Analysis Mode</label>
                        {isEnsemble ? (
                             <div className="bg-gray-900 border border-gray-600 text-blue-300 text-sm rounded-lg block w-full p-2.5">Time Series (Ensemble) - Auto-detected</div>
                        ) : (
                            <select 
                                value={analysisMode} 
                                onChange={(e) => setAnalysisMode(e.target.value as AnalysisMode)}
                                className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            >
                                <option value="joint">Joint Distribution (Cross-sectional)</option>
                                <option value="timeSeries">Time Series (Single Trace)</option>
                            </select>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            {analysisMode === 'timeSeries' ? 'Data is a single sequence over time.' : analysisMode === 'joint' ? 'Each row is an independent observation.' : 'Multiple time series instances detected.'}
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