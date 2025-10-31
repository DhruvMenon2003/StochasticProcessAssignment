import React, { useState, useCallback, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { ModelInput } from './components/ModelInput';
import { ResultsDisplay } from './components/ResultsDisplay';
import { CalculatorIcon } from './components/icons/CalculatorIcon';
import { parseCsvData } from './utils/csvParser';
import { analyzeData, AnalysisResult } from './services/stochasticService';
import { getAnalysisExplanation } from './services/geminiService';
import { CsvData, ProbabilityModel, VariableDef } from './types';
import { cartesianProduct } from './utils/mathUtils';

export default function App() {
  const [csvString, setCsvString] = useState<string>('');
  const [modelString, setModelString] = useState<string>('');
  const [modelError, setModelError] = useState<string | null>(null);
  
  // State for the new model builder
  const [variables, setVariables] = useState<VariableDef[]>([]);
  const [probabilities, setProbabilities] = useState<Record<string, number>>({});

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to automatically detect variables from CSV input
  useEffect(() => {
    const data = parseCsvData(csvString);
    const headers = data.headers;

    setVariables(currentVariables => {
        const currentHeaders = currentVariables.map(v => v.name);
        if (headers.join(',') === currentHeaders.join(',')) {
            return currentVariables;
        }

        if (headers.length === 0) {
            setProbabilities({});
            return [];
        }
        
        const oldVariablesMap = new Map(currentVariables.map(v => [v.name, v]));
        const newVariables = headers.map(header => ({
            name: header,
            states: oldVariablesMap.get(header)?.states || '',
        }));

        setProbabilities({});
        return newVariables;
    });
  }, [csvString]);

  // Effect to sync model builder state with the internal modelString
  useEffect(() => {
    if (variables.some(v => !v.name || !v.states)) {
      setModelString('');
      setModelError(null);
      return;
    }
    
    const stateSpaces = variables.map(v => v.states.split(',').map(s => s.trim()).filter(Boolean));
    if (stateSpaces.some(ss => ss.length === 0)) {
      setModelString('');
      setModelError(null);
      return;
    }

    const allCombinations = cartesianProduct(...stateSpaces);
    
    let totalProb = 0;
    const model: ProbabilityModel = allCombinations.map(combo => {
      const key = combo.join('|');
      const probability = probabilities[key] || 0;
      totalProb += probability;
      const states: Record<string, string | number> = {};
      variables.forEach((v, i) => {
        const stateValue = combo[i];
        states[v.name] = isNaN(Number(stateValue)) ? stateValue : Number(stateValue);
      });
      return { states, probability };
    });

    // Check for probability sum (with a small tolerance for floating point errors)
    if (Math.abs(totalProb - 1.0) > 0.0001 && totalProb > 0) {
        setModelError(`Probabilities sum to ${totalProb.toFixed(4)}, but should sum to 1.`);
    } else {
        setModelError(null);
    }

    setModelString(JSON.stringify(model));
  }, [variables, probabilities]);


  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setExplanation(null);

    try {
      if (!csvString.trim()) {
        throw new Error('Dataset cannot be empty.');
      }
      if (modelError) {
        throw new Error('Model is not valid. Please fix it before analyzing.');
      }

      const data: CsvData = parseCsvData(csvString);
      if (data.headers.length === 0 || data.rows.length === 0) {
        throw new Error('Invalid or empty dataset provided.');
      }

      let model: ProbabilityModel | null = null;
      // Use the generated model string if it's not empty/just an empty array
      if (modelString.trim() && modelString.trim() !== '[]') {
        model = JSON.parse(modelString);
      }

      const results = analyzeData(data, model);
      setAnalysisResult(results);

      // Get explanation from Gemini service
      const geminiExplanation = await getAnalysisExplanation(results);
      setExplanation(geminiExplanation);

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [csvString, modelString, modelError]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
            Stochastic Process Analyzer
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Evaluate datasets against probability models with advanced stochastic metrics.
          </p>
        </header>

        <div className="space-y-8">
          <DataInput value={csvString} onChange={setCsvString} />
          <ModelInput 
            variables={variables}
            setVariables={setVariables}
            probabilities={probabilities}
            setProbabilities={setProbabilities}
            error={modelError}
          />
        </div>

        <div className="text-center mt-10">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !csvString.trim() || !!modelError}
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <CalculatorIcon className="mr-3 h-6 w-6" />
                Analyze Process
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {analysisResult && (
          <div className="mt-12">
            <ResultsDisplay results={analysisResult} explanation={explanation} />
          </div>
        )}
      </main>
      <footer className="text-center py-6 text-gray-500 text-sm">
        <p>Built for advanced stochastic analysis. Copyright &copy; 2024</p>
      </footer>
    </div>
  );
}