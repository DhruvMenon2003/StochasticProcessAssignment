import React, { useState, useCallback, useEffect } from 'react';
import { DataInput } from './components/DataInput';
import { ResultsDisplay } from './components/ResultsDisplay';
import { CalculatorIcon } from './components/icons/CalculatorIcon';
import { parseCsvData } from './utils/csvParser';
import { analyzeData, AnalysisResult } from './services/stochasticService';
import { getAnalysisExplanation } from './services/geminiService';
import { CsvData, ModelDef, VariableDef, AnalysisOptions } from './types';
import { ModelsManager } from './components/ModelsManager';
import { AnalysisOptions as AnalysisOptionsComponent } from './components/AnalysisOptions';

export default function App() {
  const [csvString, setCsvString] = useState<string>('');
  const [models, setModels] = useState<ModelDef[]>([]);
  const [templateVariables, setTemplateVariables] = useState<VariableDef[]>([]);
  
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>({
    runMarkovOrderTest: false,
    runTimeHomogeneityTest: false,
  });

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to automatically detect variables from CSV to use as a template for new models
  useEffect(() => {
    try {
      const data = parseCsvData(csvString);
      const headers = data.headers;
      
      if (headers.length === 0) {
        setTemplateVariables([]);
        return;
      }
      
      const newVariables = headers.map(header => ({
          name: header,
          states: '',
      }));
      setTemplateVariables(newVariables);
    } catch (e) {
      // Ignore parsing errors during typing
    }
  }, [csvString]);


  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setExplanation(null);

    try {
      if (!csvString.trim()) {
        throw new Error('Dataset cannot be empty.');
      }
      
      const modelsWithErrors = models.filter(m => m.error);
      if (modelsWithErrors.length > 0) {
        throw new Error(`Model '${modelsWithErrors[0].name}' is not valid. Please fix it before analyzing.`);
      }

      const data: CsvData = parseCsvData(csvString);
      if (data.headers.length === 0 || data.rows.length === 0) {
        throw new Error('Invalid or empty dataset provided.');
      }
      
      const parsedModels = models
        .filter(m => m.modelString.trim() && m.modelString.trim() !== '[]')
        .map(m => ({
          name: m.name,
          model: JSON.parse(m.modelString)
        }));

      const results = analyzeData(data, parsedModels, analysisOptions);
      setAnalysisResult(results);

      // Get explanation from Gemini service
      const geminiExplanation = await getAnalysisExplanation(results);
      setExplanation(geminiExplanation);

    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [csvString, models, analysisOptions]);

  const hasAnyInvalidModel = models.some(m => !!m.error);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
            Stochastic Process Analyzer
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Evaluate datasets against multiple probability models with advanced stochastic metrics.
          </p>
        </header>

        <div className="space-y-8">
          <DataInput value={csvString} onChange={setCsvString} />
          <ModelsManager 
            models={models}
            setModels={setModels}
            templateVariables={templateVariables}
          />
          <AnalysisOptionsComponent
            options={analysisOptions}
            setOptions={setAnalysisOptions}
          />
        </div>

        <div className="text-center mt-10">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !csvString.trim() || hasAnyInvalidModel}
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
