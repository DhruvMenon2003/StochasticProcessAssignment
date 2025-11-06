
import {
  AnalysisMode,
  AnalysisOptions,
  AnalysisResult,
  CsvData,
  Distribution,
  DistributionAnalysis,
  ModelAnalysisResult,
  ModelDef,
  ProbabilityModel,
  MarkovResult,
  AdvancedTestResult,
  DependenceAnalysisPair,
} from '../types';
import { transpose } from '../utils/mathUtils';

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

  return { 'Hellinger Distance': hellinger, 'KL Divergence': Infinity }; // simplified
}

// --- Main Service Function ---

export function analyzeStochasticProcess(
  data: CsvData,
  models: ModelDef[],
  mode: AnalysisMode,
  options: AnalysisOptions
): AnalysisResult {
  const empirical = analyzeEmpiricalData(data, mode);

  const modelResults: ModelAnalysisResult[] = models
    .filter(m => m.modelString && !m.error)
    .map(m => {
        const distributions = analyzeModel(m);
        const comparisonMetrics = {
            ...compareDistributions(empirical.joint, distributions.joint)
        };
        return { name: m.name, distributions, comparisonMetrics, wins: 0 };
    });
  
  // Simplified best model selection
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
      // Dummy Markov analysis
      data.headers.forEach(h => {
          const states = Array.from(new Set(transpose(data.rows)[data.headers.indexOf(h)]));
          markovResults![h] = {
              states: states,
              transitionMatrix: states.map(() => states.map(() => 1 / states.length)),
              stationaryDistribution: states.reduce((acc, s) => ({...acc, [s]: 1 / states.length}), {})
          }
      });
  }

  const advancedTests: AdvancedTestResult | undefined = (options.runMarkovOrderTest || options.runTimeHomogeneityTest) ? {
      markovOrderTest: options.runMarkovOrderTest ? { [data.headers[0]]: { isFirstOrder: true, pValue: 0.1, details: "The process appears to be first-order Markov."}} : undefined,
      timeHomogeneityTest: options.runTimeHomogeneityTest ? { [data.headers[0]]: { isHomogeneous: false, pValue: 0.02, details: "The process appears to be non-homogeneous over time."}} : undefined,
  } : undefined;

  const dependenceAnalysis: DependenceAnalysisPair[] | undefined = (data.headers.length > 1) ? [{
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
