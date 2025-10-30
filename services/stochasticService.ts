import { CsvData, ProbabilityModel, Distribution } from '../types';

// --- New Interfaces for advanced analysis ---
export interface MarkovAnalysis {
  states: (string | number)[];
  transitionMatrix: number[][];
  stationaryDistribution: Distribution;
}

export interface MarkovResult {
  [header: string]: MarkovAnalysis;
}

interface CalculatedDistributions {
  joint: Distribution;
  marginals: { [key: string]: Distribution };
}

export interface AnalysisResult {
  headers: string[];
  empirical: CalculatedDistributions;
  model?: CalculatedDistributions;
  modelComparison?: {
    hellingerDistance: number;
    meanSquaredError: number;
    kullbackLeiblerDivergence: number;
  };
  dependence?: {
    mutualInformation: number | null;
  };
  markov?: MarkovResult;
}

// --- Helper Functions ---
const getKeyFromStates = (states: (string | number)[]): string => states.join('|');

const getJointPMF = (data: CsvData): Distribution => {
  const jointCounts: { [key: string]: number } = {};
  const totalRows = data.rows.length;

  data.rows.forEach(row => {
    const key = getKeyFromStates(row);
    jointCounts[key] = (jointCounts[key] || 0) + 1;
  });

  const jointPMF: Distribution = {};
  for (const key in jointCounts) {
    jointPMF[key] = jointCounts[key] / totalRows;
  }
  return jointPMF;
};

const getModelJointPMF = (model: ProbabilityModel, headers: string[]): Distribution => {
    const jointPMF: Distribution = {};
    model.forEach(entry => {
        const stateValues = headers.map(h => entry.states[h]);
        const key = getKeyFromStates(stateValues);
        jointPMF[key] = entry.probability;
    });
    return jointPMF;
};

const getMarginals = (jointPMF: Distribution, headers: string[]): { [key: string]: Distribution } => {
  const marginals: { [key: string]: Distribution } = {};
  headers.forEach((header, index) => {
    const marginal: Distribution = {};
    for (const jointKey in jointPMF) {
      const states = jointKey.split('|');
      const marginalKey = states[index];
      marginal[marginalKey] = (marginal[marginalKey] || 0) + jointPMF[jointKey];
    }
    marginals[header] = marginal;
  });
  return marginals;
};

// --- Metric Functions ---
const hellingerDistance = (p: Distribution, q: Distribution): number => {
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let sum = 0;
    allKeys.forEach(key => {
        const pVal = p[key] || 0;
        const qVal = q[key] || 0;
        sum += (Math.sqrt(pVal) - Math.sqrt(qVal))**2;
    });
    return Math.sqrt(sum) / Math.sqrt(2);
};

const meanSquaredError = (p: Distribution, q: Distribution): number => {
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let sum = 0;
    allKeys.forEach(key => {
        const pVal = p[key] || 0;
        const qVal = q[key] || 0;
        sum += (pVal - qVal)**2;
    });
    return sum / allKeys.size;
};

const kullbackLeiblerDivergence = (p: Distribution, q: Distribution): number => {
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let divergence = 0;
    allKeys.forEach(key => {
        const pVal = p[key] || 0;
        const qVal = q[key] || 0;
        if (pVal > 0 && qVal > 0) {
            divergence += pVal * Math.log(pVal / qVal);
        } else if (pVal > 0 && qVal === 0) {
            return Infinity; // KL is infinite if p(x) > 0 and q(x) = 0
        }
    });
    return divergence;
};

const getMutualInformation = (jointPMF: Distribution, marginals: { [key: string]: Distribution }, headers: string[]): number | null => {
    if (headers.length !== 2) return null; // MI is typically pairwise
    const [h1, h2] = headers;
    const m1 = marginals[h1];
    const m2 = marginals[h2];
    let mi = 0;
    for (const jointKey in jointPMF) {
        const states = jointKey.split('|');
        const s1 = states[0];
        const s2 = states[1];
        const p_xy = jointPMF[jointKey];
        const p_x = m1[s1];
        const p_y = m2[s2];
        if (p_xy > 0 && p_x > 0 && p_y > 0) {
            mi += p_xy * Math.log2(p_xy / (p_x * p_y));
        }
    }
    return mi;
};

// --- Markov Analysis Functions ---
const getTransitionMatrix = (series: (string | number)[]): { states: (string | number)[], matrix: number[][] } => {
    const states = Array.from(new Set(series)).sort();
    const stateIndex = new Map(states.map((s, i) => [s, i]));
    const n = states.length;
    const counts = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < series.length - 1; i++) {
        const from = stateIndex.get(series[i])!;
        const to = stateIndex.get(series[i+1])!;
        counts[from][to]++;
    }

    const matrix = counts.map(row => {
        const total = row.reduce((a, b) => a + b, 0);
        return total > 0 ? row.map(count => count / total) : row;
    });
    
    return { states, matrix };
};

const getStationaryDistribution = (transitionMatrix: number[][], states: (string | number)[]): Distribution => {
    const n = transitionMatrix.length;
    if (n === 0) return {};
    
    let p = Array(n).fill(1 / n); // Start with uniform distribution
    
    // Power iteration method
    for (let iter = 0; iter < 1000; iter++) {
        const pNext = Array(n).fill(0);
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                pNext[j] += p[i] * transitionMatrix[i][j];
            }
        }
        
        // Check for convergence
        let diff = 0;
        for (let i = 0; i < n; i++) {
            diff += Math.abs(pNext[i] - p[i]);
        }
        if (diff < 1e-9) break;

        p = pNext;
    }
    
    const dist: Distribution = {};
    states.forEach((state, i) => {
        dist[String(state)] = p[i];
    });

    return dist;
};


// --- Main Analysis Function ---
export function analyzeData(data: CsvData, model: ProbabilityModel | null): AnalysisResult {
  if (data.rows.length === 0) throw new Error("Dataset has no rows to analyze.");

  const empiricalJoint = getJointPMF(data);
  const empiricalMarginals = getMarginals(empiricalJoint, data.headers);
  const empiricalDists: CalculatedDistributions = { joint: empiricalJoint, marginals: empiricalMarginals };

  let result: AnalysisResult = { 
    headers: data.headers, 
    empirical: empiricalDists 
  };
  
  // Dependence analysis
  result.dependence = {
      mutualInformation: getMutualInformation(empiricalJoint, empiricalMarginals, data.headers)
  };
  
  // Markov analysis (if more than one data point)
  if (data.rows.length > 1) {
    const markovResult: MarkovResult = {};
    data.headers.forEach((header, index) => {
        const series = data.rows.map(row => row[index]);
        const { states, matrix } = getTransitionMatrix(series);
        if (states.length > 0) {
            const stationaryDistribution = getStationaryDistribution(matrix, states);
            markovResult[header] = { states, transitionMatrix: matrix, stationaryDistribution };
        }
    });
    result.markov = markovResult;
  }


  if (model) {
    const modelJoint = getModelJointPMF(model, data.headers);
    const modelMarginals = getMarginals(modelJoint, data.headers);
    const modelDists: CalculatedDistributions = { joint: modelJoint, marginals: modelMarginals };
    
    result.model = modelDists;

    result.modelComparison = {
        hellingerDistance: hellingerDistance(empiricalJoint, modelJoint),
        meanSquaredError: meanSquaredError(empiricalJoint, modelJoint),
        kullbackLeiblerDivergence: kullbackLeiblerDivergence(empiricalJoint, modelJoint),
    };
  }

  return result;
}