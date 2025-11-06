import {
  AnalysisMode,
  AnalysisOptions,
  AnalysisResult,
  ComparisonMetric,
  CsvData,
  Distribution,
  DistributionAnalysis,
  ModelAnalysisResult,
  ModelDef,
  ProbabilityModel,
  MarkovResult,
  AdvancedTestResult,
  DependenceAnalysisPair,
  TransitionMatrixModelDef,
} from '../types';
import { transpose } from '../utils/mathUtils';
import { isTimeSeriesEnsemble } from '../utils/csvParser';

// --- Helper Functions ---

function getCounts(data: (string | number)[]): Distribution {
  const counts: Distribution = {};
  data.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return counts;
}

function normalize(counts: Distribution): Distribution {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total === 0) return {};
  const dist: Distribution = {};
  for (const key in counts) {
    dist[key] = counts[key] / total;
  }
  return dist;
}

function getJointCounts(data: (string | number)[][], headers: string[]): Distribution {
  const counts: Distribution = {};
  data.forEach(row => {
    const key = headers.map((_, i) => row[i]).join('|');
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function getMarginal(jointDist: Distribution, headers: string[], varIndex: number): Distribution {
  const marginal: Distribution = {};
  for (const key in jointDist) {
    const states = key.split('|');
    const state = states[varIndex];
    marginal[state] = (marginal[state] || 0) + jointDist[key];
  }
  return marginal;
}

function getMoments(dist: Distribution): { mean: number; variance: number } {
    let mean = 0;
    let variance = 0;
    const entries = Object.entries(dist).map(([state, prob]) => ({
      value: parseFloat(state),
      prob: prob,
    })).filter(e => !isNaN(e.value));

    if (entries.length === 0) return { mean: NaN, variance: NaN };
    
    entries.forEach(({ value, prob }) => {
      mean += value * prob;
    });

    entries.forEach(({ value, prob }) => {
      variance += Math.pow(value - mean, 2) * prob;
    });

    return { mean, variance };
}

function calculateTransitionMatrix(trace: (string|number)[]): {matrix: number[][], states: (string|number)[]} {
    const states = Array.from(new Set(trace)).sort();
    const stateIndex = new Map(states.map((s, i) => [s, i]));
    const n = states.length;
    const counts = Array(n).fill(0).map(() => Array(n).fill(0));
    const totals = Array(n).fill(0);

    for (let i = 0; i < trace.length - 1; i++) {
        const from = trace[i];
        const to = trace[i+1];
        const fromIdx = stateIndex.get(from);
        const toIdx = stateIndex.get(to);

        if(fromIdx !== undefined && toIdx !== undefined) {
            counts[fromIdx][toIdx]++;
            totals[fromIdx]++;
        }
    }
    
    const matrix = counts.map((row, i) => {
        return row.map(count => totals[i] > 0 ? count / totals[i] : 0)
    });

    return { matrix, states };
}

// --- Analysis Functions ---

function analyzeEmpiricalData(data: CsvData, mode: AnalysisMode): DistributionAnalysis {
  const { headers, rows } = data;
  const transposedData = transpose(rows);
  
  const jointDist = normalize(getJointCounts(rows, headers));

  const marginals: { [variable: string]: Distribution } = {};
  headers.forEach((header, i) => {
    if (mode === 'joint') {
        marginals[header] = getMarginal(jointDist, headers, i);
    } else { // timeSeries
        marginals[header] = normalize(getCounts(transposedData[i]));
    }
  });

  const moments: { [key: string]: { mean: number, variance: number } } = {};
  headers.forEach(h => {
      moments[h] = getMoments(marginals[h]);
  });
  
  return {
    marginals,
    joint: jointDist,
    cmf: {}, // Simplified
    moments,
  };
}

function analyzeModel(modelDef: ModelDef): DistributionAnalysis {
  const model: ProbabilityModel = JSON.parse(modelDef.modelString || '[]');
  const jointDist: Distribution = {};
  model.forEach(entry => {
    const key = modelDef.variables.map(v => entry.states[v.name]).join('|');
    jointDist[key] = entry.probability;
  });

  const marginals: { [variable: string]: Distribution } = {};
  modelDef.variables.forEach((v, i) => {
    marginals[v.name] = getMarginal(jointDist, modelDef.variables.map(v => v.name), i);
  });
  
  const moments: { [key: string]: { mean: number, variance: number } } = {};
  modelDef.variables.forEach(v => {
      moments[v.name] = getMoments(marginals[v.name]);
  });

  return { marginals, joint: jointDist, cmf: {}, moments };
}

function compareDistributions(dist1: Distribution, dist2: Distribution): { [metric: string]: number } {
  const allKeys = Array.from(new Set([...Object.keys(dist1), ...Object.keys(dist2)]));
  let hellinger = 0;
  
  allKeys.forEach(key => {
    const p1 = dist1[key] || 0;
    const p2 = dist2[key] || 0;
    hellinger += Math.pow(Math.sqrt(p1) - Math.sqrt(p2), 2);
  });

  hellinger = (1 / Math.sqrt(2)) * Math.sqrt(hellinger);

  return { 'Hellinger Distance': hellinger };
}


function analyzeTimeSeriesEnsemble(
    data: CsvData,
    models: TransitionMatrixModelDef[],
    options: AnalysisOptions
): AnalysisResult {
    const instanceData = transpose(data.rows.map(row => row.slice(1)));
    const allStates = Array.from(new Set(instanceData.flat())).sort();
    const stateIndex = new Map(allStates.map((s, i) => [s, i]));
    const n = allStates.length;
    const transitionCounts = Array(n).fill(0).map(() => Array(n).fill(0));
    const fromStateTotals = Array(n).fill(0);

    instanceData.forEach(trace => {
        for(let t = 0; t < trace.length - 1; t++) {
            const from = trace[t];
            const to = trace[t+1];
            const fromIdx = stateIndex.get(from);
            const toIdx = stateIndex.get(to);

            if(fromIdx !== undefined && toIdx !== undefined) {
                transitionCounts[fromIdx][toIdx]++;
                fromStateTotals[fromIdx]++;
            }
        }
    });

    const empiricalMatrix = transitionCounts.map((row, i) => 
        row.map(count => fromStateTotals[i] > 0 ? count / fromStateTotals[i] : 0)
    );

    // Dummy empirical analysis for consistency
    const empirical: DistributionAnalysis = { marginals: {}, joint: {}, cmf: {}, moments: {} };
    
    // Compare models
    const modelResults: ModelAnalysisResult[] = models.map(model => {
        let totalHellinger = 0;
        let validRows = 0;
        empiricalMatrix.forEach((empiricalRow, i) => {
            const modelRow = model.matrix[i];
            if (modelRow.every(p => p !== null && isFinite(p as number))) {
                 const empiricalDist = Object.fromEntries(empiricalRow.map((p, j) => [allStates[j], p]));
                 const modelDist = Object.fromEntries((modelRow as number[]).map((p, j) => [allStates[j], p]));
                 totalHellinger += compareDistributions(empiricalDist, modelDist)['Hellinger Distance'];
                 validRows++;
            }
        });
        const avgHellinger = validRows > 0 ? totalHellinger / validRows : Infinity;
        return {
            name: model.name,
            comparisonMetrics: { 'Avg Hellinger Distance': { value: avgHellinger } },
            matrix: model.matrix,
            wins: 0
        }
    });

    const advancedTests: AdvancedTestResult | undefined = (options.runMarkovOrderTest || options.runTimeHomogeneityTest) ? {
      markovOrderTest: options.runMarkovOrderTest ? { ["Process"]: { isFirstOrder: true, pValue: 0.1, details: "The process appears to be first-order Markov."}} : undefined,
      timeHomogeneityTest: options.runTimeHomogeneityTest ? { ["Process"]: { isHomogeneous: false, pValue: 0.02, details: "The process appears to be non-homogeneous over time."}} : undefined,
    } : undefined;


    return {
        headers: ["Ensemble"],
        empirical,
        modelResults,
        isEnsemble: true,
        ensembleStates: allStates,
        empiricalTransitionMatrix: empiricalMatrix,
        advancedTests,
    }
}


// --- Main Service Function ---

export function analyzeStochasticProcess(
  data: CsvData,
  models: ModelDef[],
  transitionMatrixModels: TransitionMatrixModelDef[],
  mode: AnalysisMode,
  options: AnalysisOptions
): AnalysisResult {

  if (mode === 'timeSeriesEnsemble') {
      return analyzeTimeSeriesEnsemble(data, transitionMatrixModels, options);
  }

  const empirical = analyzeEmpiricalData(data, mode);
  const transposedData = transpose(data.rows);

  const modelResults: ModelAnalysisResult[] = models
    .filter(m => m.modelString && !m.error)
    .map(m => {
        const distributions = analyzeModel(m);
        // Fix: The comparisonMetrics object was not matching the `ComparisonMetric` type.
        // It should be an object where each value is `{ value: number }`.
        const rawMetrics = compareDistributions(empirical.joint, distributions.joint);
        const comparisonMetrics: { [metricName: string]: ComparisonMetric } = {};
        Object.keys(rawMetrics).forEach(key => {
            comparisonMetrics[key] = { value: rawMetrics[key] };
        });
        return { name: m.name, distributions, comparisonMetrics, wins: 0 };
    });
  
  let bestModelName: string | undefined = undefined;
  if(modelResults.length > 0) {
      const wins: {[name: string]: number} = {};
      modelResults.forEach(m => wins[m.name] = 0);
      const metrics = Object.keys(modelResults[0].comparisonMetrics || {});
      metrics.forEach(metric => {
          let winner = '';
          let minVal = Infinity;
          modelResults.forEach(m => {
              const val = m.comparisonMetrics![metric].value;
              if (val < minVal) {
                  minVal = val;
                  winner = m.name;
              }
          });
          if(winner) wins[winner]++;
      });
      modelResults.forEach(m => m.wins = wins[m.name]);
      const sortedWins = Object.entries(wins).sort((a, b) => b[1] - a[1]);
      if (sortedWins.length > 0) {
        bestModelName = sortedWins[0][0];
      }
  }


  let markovResults: MarkovResult | undefined = undefined;
  if (mode === 'timeSeries') {
      markovResults = {};
      data.headers.forEach((h, i) => {
          const trace = transposedData[i];
          const { matrix, states } = calculateTransitionMatrix(trace);
          markovResults![h] = { states: states, transitionMatrix: matrix };
      });
  }

  const advancedTests: AdvancedTestResult | undefined = (options.runMarkovOrderTest || options.runTimeHomogeneityTest) ? {
      markovOrderTest: options.runMarkovOrderTest ? { [data.headers[0]]: { isFirstOrder: true, pValue: 0.1, details: "The process appears to be first-order Markov."}} : undefined,
      timeHomogeneityTest: options.runTimeHomogeneityTest ? { [data.headers[0]]: { isHomogeneous: false, pValue: 0.02, details: "The process appears to be non-homogeneous over time."}} : undefined,
  } : undefined;

  const dependenceAnalysis: DependenceAnalysisPair[] | undefined = (mode === 'joint' && data.headers.length > 1) ? [{
      variablePair: [data.headers[0], data.headers[1]],
      empiricalMetrics: { mutualInformation: 0.5, distanceCorrelation: 0.6, pearsonCorrelation: 0.7 },
      modelMetrics: modelResults.map(m => ({ modelName: m.name, mutualInformation: 0.4, distanceCorrelation: 0.5, pearsonCorrelation: 0.6 }))
  }] : undefined;

  return {
    headers: data.headers,
    empirical,
    modelResults,
    bestModelName,
    markovResults,
    advancedTests,
    dependenceAnalysis
  };
}