
import React, { useState, useCallback } from 'react';
import { DataInput } from './components/DataInput';
import { ModelInput } from './components/ModelInput';
import { ResultsDisplay } from './components/ResultsDisplay';
import { CalculatorIcon } from './components/icons/CalculatorIcon';
import { parseCsvData } from './utils/csvParser';
import { analyzeData, AnalysisResult } from './services/stochasticService';
import { getAnalysisExplanation } from './services/geminiService';
import { CsvData, ProbabilityModel } from './types';

export default function App() {
  const [csvString, setCsvString] = useState<string>('');
  const [modelString, setModelString] = useState<string>('');
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setExplanation(null);

    try {
      if (!csvString.trim()) {
        throw new Error('Dataset cannot be empty.');
      }

      const data: CsvData = parseCsvData(csvString);
      if (data.headers.length === 0 || data.rows.length === 0) {
        throw new Error('Invalid or empty dataset provided.');
      }

      let model: ProbabilityModel | null = null;
      if (modelString.trim()) {
        try {
          model = JSON.parse(modelString);
        } catch (e) {
          throw new Error('Model JSON is not valid. Please check the format.');
        }
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
  }, [csvString, modelString]);

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DataInput value={csvString} onChange={setCsvString} />
          <ModelInput value={modelString} onChange={setModelString} />
        </div>

        <div className="text-center mt-10">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !csvString.trim()}
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
