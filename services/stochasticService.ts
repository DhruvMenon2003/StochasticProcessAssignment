
import { CsvData, ProbabilityModel, Distribution, PmfEntry } from '../types';

interface CalculatedDistributions {
  joint: Distribution;
  marginals: { [key: string]: Distribution };
}

export interface AnalysisResult {
  empirical: CalculatedDistributions;
  model?: CalculatedDistributions;
  modelComparison?: {
    hellingerDistance: number;
    meanSquaredError: number;
  };
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


// --- Main Analysis Function ---
export function analyzeData(data: CsvData, model: ProbabilityModel | null): AnalysisResult {
  const empiricalJoint = getJointPMF(data);
  const empiricalMarginals = getMarginals(empiricalJoint, data.headers);
  const empiricalDists: CalculatedDistributions = { joint: empiricalJoint, marginals: empiricalMarginals };

  let result: AnalysisResult = { empirical: empiricalDists };

  if (model) {
    const modelJoint = getModelJointPMF(model, data.headers);
    const modelMarginals = getMarginals(modelJoint, data.headers);
    const modelDists: CalculatedDistributions = { joint: modelJoint, marginals: modelMarginals };
    
    result.model = modelDists;

    result.modelComparison = {
        hellingerDistance: hellingerDistance(empiricalJoint, modelJoint),
        meanSquaredError: meanSquaredError(empiricalJoint, modelJoint),
    };
  }

  return result;
}
