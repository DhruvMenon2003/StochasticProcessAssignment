import { CsvData, ProbabilityModel, Distribution, AnalysisOptions, CalculatedDistributions, ModelAnalysisResult } from '../types';

// --- Interfaces for analysis results ---
export interface MarkovAnalysis {
  states: (string | number)[];
  transitionMatrix: number[][];
  stationaryDistribution: Distribution;
}

export interface MarkovResult {
  [header: string]: MarkovAnalysis;
}

export interface TimeHomogeneityResult {
    [header: string]: {
        isHomogeneous: boolean;
        maxDistance: number;
    }
}

export interface MarkovOrderResult {
    [header: string]: {
        order: number;
        meanDistance: number;
        isMarkovian: boolean;
    }[];
}

export interface AnalysisResult {
  headers: string[];
  isSingleVariable: boolean;
  empirical: CalculatedDistributions;
  modelResults?: ModelAnalysisResult[];
  bestModelName?: string;
  dependence?: {
    mutualInformation: number | null;
  };
  markov?: MarkovResult;
  timeHomogeneityTest?: TimeHomogeneityResult;
  markovOrderTest?: MarkovOrderResult;
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

const calculateMoments = (dist: Distribution): { mean: number; variance: number } => {
    let mean = 0;
    
    // First pass to calculate mean
    for (const state in dist) {
        const numState = Number(state);
        if (!isNaN(numState)) {
            mean += numState * dist[state];
        }
    }

    let variance = 0;
    // Second pass to calculate variance
    for (const state in dist) {
        const numState = Number(state);
        if (!isNaN(numState)) {
            variance += ((numState - mean) ** 2) * dist[state];
        }
    }
    return { mean, variance };
};

const calculateCmf = (dist: Distribution): Distribution => {
    const sortedStates = Object.keys(dist).sort((a, b) => Number(a) - Number(b));
    const cmf: Distribution = {};
    let cumulative = 0;
    for (const state of sortedStates) {
        cumulative += dist[state];
        cmf[state] = cumulative;
    }
    return cmf;
};

// --- Metric Functions ---
const hellingerDistance = (p: Distribution, q: Distribution): number => {
    if (!p || !q) return 1;
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let sum = 0;
    allKeys.forEach(key => {
        const pVal = p[key] || 0;
        const qVal = q[key] || 0;
        sum += (Math.sqrt(pVal) - Math.sqrt(qVal))**2;
    });
    return Math.sqrt(sum) / Math.sqrt(2);
};

const kullbackLeiblerDivergence = (p: Distribution, q: Distribution): number => {
    const epsilon = 1e-10; // Small value to avoid log(0)
    const allKeys = new Set([...Object.keys(p), ...Object.keys(q)]);
    let divergence = 0;

    for (const key of allKeys) {
        const pVal = p[key] || 0;
        const qVal = q[key] || 0;

        if (pVal > 0) {
            // Use epsilon for qVal if it's zero, to avoid infinity.
            // This is inspired by the MATLAB function's recommendation.
            const qValAdjusted = qVal === 0 ? epsilon : qVal;
            divergence += pVal * Math.log2(pVal / qValAdjusted);
        }
    }
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
    const states = Array.from(new Set(series)).sort((a,b) => String(a).localeCompare(String(b)));
    const stateIndex = new Map(states.map((s, i) => [s, i]));
    const n = states.length;
    const counts = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < series.length - 1; i++) {
        const from = stateIndex.get(series[i]);
        const to = stateIndex.get(series[i+1]);
        if (from !== undefined && to !== undefined) {
          counts[from][to]++;
        }
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
    
    for (let iter = 0; iter < 1000; iter++) {
        const pNext = Array(n).fill(0);
        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                pNext[j] += p[i] * transitionMatrix[i][j];
            }
        }
        
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

// --- New Advanced Analysis Functions ---
const testTimeHomogeneity = (series: (string | number)[], numSegments: number = 2): { isHomogeneous: boolean; maxDistance: number } => {
    const segmentLength = Math.floor(series.length / numSegments);
    if (segmentLength < 20) return { isHomogeneous: true, maxDistance: 0 }; // Not enough data

    const matrices = [];
    for (let i = 0; i < numSegments; i++) {
        const segment = series.slice(i * segmentLength, (i + 1) * segmentLength);
        matrices.push(getTransitionMatrix(segment).matrix);
    }
    
    let maxDist = 0;
    for (let i = 0; i < numSegments; i++) {
        for (let j = i + 1; j < numSegments; j++) {
            const m1 = matrices[i].flat();
            const m2 = matrices[j].flat();
            if(m1.length !== m2.length) continue;

            const dist = hellingerDistance(
                Object.fromEntries(m1.map((p, k) => [k, p])),
                Object.fromEntries(m2.map((p, k) => [k, p]))
            );
            if (dist > maxDist) maxDist = dist;
        }
    }

    return {
        isHomogeneous: maxDist < 0.1, // Threshold from MATLAB example
        maxDistance: maxDist
    };
};

const analyzeMarkovOrder = (series: (string | number)[], maxOrder: number = 1): MarkovOrderResult[string] => {
    const results = [];
    if (series.length < 20) return [];

    // Order 1 test
    const { matrix: tMatrix, states } = getTransitionMatrix(series);
    const stationaryDist = getStationaryDistribution(tMatrix, states);

    let totalDist = 0;
    for(let i = 0; i < tMatrix.length; i++) {
        const rowDist = Object.fromEntries(tMatrix[i].map((p, k) => [states[k], p]));
        totalDist += hellingerDistance(rowDist, stationaryDist);
    }

    const meanDist = tMatrix.length > 0 ? totalDist / tMatrix.length : 0;
    
    results.push({
        order: 1,
        meanDistance: meanDist,
        isMarkovian: meanDist > 0.1, // If dist is high, it's NOT independent, so it IS Markovian
    });

    // Higher orders are complex, so we'll stick to a simplified 1st order test.
    return results;
};


// --- Main Analysis Function ---
export function analyzeData(
    data: CsvData, 
    models: {name: string, model: ProbabilityModel}[],
    options: AnalysisOptions
): AnalysisResult {
  if (data.rows.length === 0) throw new Error("Dataset has no rows to analyze.");

  const isSingleVariable = data.headers.length === 1;
  const empiricalJoint = getJointPMF(data);
  const empiricalMarginals = getMarginals(empiricalJoint, data.headers);
  const empiricalDists: CalculatedDistributions = { joint: empiricalJoint, marginals: empiricalMarginals };

  if (isSingleVariable) {
      const singleVarHeader = data.headers[0];
      const singleVarDist = empiricalMarginals[singleVarHeader];
      empiricalDists.moments = calculateMoments(singleVarDist);
      empiricalDists.cmf = calculateCmf(singleVarDist);
  }

  let result: AnalysisResult = { 
    headers: data.headers, 
    isSingleVariable,
    empirical: empiricalDists 
  };
  
  // Dependence analysis
  result.dependence = {
      mutualInformation: getMutualInformation(empiricalJoint, empiricalMarginals, data.headers)
  };
  
  // Advanced analysis if requested
  if (options.runTimeHomogeneityTest) {
      const thResults: TimeHomogeneityResult = {};
      data.headers.forEach((h, i) => {
          thResults[h] = testTimeHomogeneity(data.rows.map(r => r[i]));
      });
      result.timeHomogeneityTest = thResults;
  }
   if (options.runMarkovOrderTest) {
      const moResults: MarkovOrderResult = {};
      data.headers.forEach((h, i) => {
          moResults[h] = analyzeMarkovOrder(data.rows.map(r => r[i]));
      });
      result.markovOrderTest = moResults;
      
      // Perform Markov Chain analysis ONLY if this option is on
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
  }

  if (models.length > 0) {
    const modelResults: ModelAnalysisResult[] = models.map(({name, model}) => {
        const modelJoint = getModelJointPMF(model, data.headers);
        const modelMarginals = getMarginals(modelJoint, data.headers);
        const modelDists: CalculatedDistributions = { joint: modelJoint, marginals: modelMarginals };

        const empiricalMetricDist = isSingleVariable ? empiricalDists.marginals[data.headers[0]] : empiricalJoint;
        const modelMetricDist = isSingleVariable ? modelDists.marginals[data.headers[0]] : modelJoint;
        
        let mse;
        if (isSingleVariable) {
            const singleVarHeader = data.headers[0];
            const empMoments = calculateMoments(empiricalDists.marginals[singleVarHeader]);
            const modMoments = calculateMoments(modelDists.marginals[singleVarHeader]);
            modelDists.moments = modMoments;
            modelDists.cmf = calculateCmf(modelDists.marginals[singleVarHeader]);

            const bias = modMoments.mean - empMoments.mean;
            mse = (bias ** 2) + modMoments.variance;
        } else {
            let totalMse = 0;
            data.headers.forEach(header => {
                const empDist = empiricalDists.marginals[header];
                const modDist = modelDists.marginals[header];

                if (empDist && modDist) {
                    const empMoments = calculateMoments(empDist);
                    const modMoments = calculateMoments(modDist);

                    const bias = modMoments.mean - empMoments.mean;
                    const marginalMse = (bias ** 2) + modMoments.variance;
                    totalMse += marginalMse;
                }
            });
            mse = data.headers.length > 0 ? totalMse / data.headers.length : 0;
        }

        return {
            name,
            distributions: modelDists,
            comparison: {
                hellingerDistance: hellingerDistance(empiricalMetricDist, modelMetricDist),
                meanSquaredError: mse,
                kullbackLeiblerDivergence: kullbackLeiblerDivergence(empiricalMetricDist, modelMetricDist),
            }
        };
    });
    
    // Perform comparison and find best model
    if (isSingleVariable && modelResults.length > 1) {
        const metrics: (keyof ModelAnalysisResult['comparison'])[] = ['hellingerDistance', 'meanSquaredError', 'kullbackLeiblerDivergence'];
        const winners: { [metric: string]: { name: string, value: number } } = {};

        metrics.forEach(metric => {
            let bestModel: ModelAnalysisResult | null = null;
            let bestValue = Infinity;
            modelResults.forEach(res => {
                const value = res.comparison[metric];
                if (isFinite(value) && value < bestValue) {
                    bestValue = value;
                    bestModel = res;
                }
            });
            if (bestModel) {
                winners[metric] = { name: bestModel.name, value: bestValue };
            }
        });
        
        modelResults.forEach(res => {
            res.comparisonMetrics = {};
            res.wins = 0;
            metrics.forEach(metric => {
                const value = res.comparison[metric];
                const isWinner = winners[metric]?.name === res.name && winners[metric]?.value === value;
                if (isWinner) res.wins!++;
                res.comparisonMetrics![metric] = { value, isWinner };
            });
        });
        
        result.bestModelName = modelResults.reduce((best, current) => (current.wins ?? 0) > (best.wins ?? 0) ? current : best).name;

    } else if (!isSingleVariable && modelResults.length > 0) {
        // Multi-variable composite score logic
        modelResults.forEach(res => {
            const { hellingerDistance: hd, meanSquaredError: mse, kullbackLeiblerDivergence: kl } = res.comparison;
            res.comparison.score = (hd + mse + (isFinite(kl) ? kl / 10 : 1));
        });
        result.bestModelName = modelResults.reduce((best, current) => (current.comparison.score ?? Infinity) < (best.comparison.score ?? Infinity) ? current : best).name;
    } else if (modelResults.length > 0) {
        result.bestModelName = modelResults[0].name;
    }

    result.modelResults = modelResults;
  }

  return result;
}