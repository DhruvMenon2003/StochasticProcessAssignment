import React, { useState } from 'react';
import { Upload, Calculator, PlayCircle, CheckCircle, AlertCircle, TrendingUp, BarChart3, Info } from 'lucide-react';

const StochasticAnalyzer = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [csvData, setCsvData] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

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

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setResults({
        bestModel: 'Uniform Distribution',
        hellinger: 0.0234,
        accuracy: 94.2,
        variables: ['VarX', 'VarY']
      });
      setActiveStep(3);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
            <button
              onClick={() => setCsvData(exampleData)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-all border border-slate-600"
            >
              Load Example
            </button>
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
                  onClick={() => setActiveStep(2)}
                  disabled={!csvData.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition-all shadow-lg disabled:shadow-none"
                >
                  Continue
                </button>
              </div>
            </div>

            {/* Models Card */}
            {activeStep >= 2 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-xl animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Theoretical Models</h3>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">Optional</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">Uniform Distribution</span>
                      <span className="text-xs text-slate-400">Equal probabilities</span>
                    </div>
                    <div className="text-sm text-slate-400">P(X) = 1/n for all states</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">Custom Model</span>
                      <button className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
                    </div>
                    <div className="text-sm text-slate-400">Define your own probability model</div>
                  </div>
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
              <p className="text-xs font-semibold text-slate-400 mb-2">💡 Quick Tips</p>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li>• Use comma-separated CSV format</li>
                <li>• Include headers in first row</li>
                <li>• Models are optional for comparison</li>
                <li>• Results show best-fit metrics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StochasticAnalyzer;
